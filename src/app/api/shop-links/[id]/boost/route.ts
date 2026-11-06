/**
 * POST /api/shop-links/[id]/boost
 *
 * 호스트가 자신의 쇼핑 링크를 유료로 추천(Featured) 상단 노출합니다.
 * Toss Payments 결제 완료 후 호출 — paymentKey + orderId 검증.
 *
 * 보안: JWT 인증 → host_id = user.id IDOR 차단 → 멱등성 키 충돌 방지.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, getAuthUser, isValidUuid, BOOST_PRICES } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { verifyTossPayment, makeIdempotencyKey, PAYMENT_METHODS, type PaymentMethod } from '@src/lib/payments'
import { isSuspended } from '@src/lib/suspended-check'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: linkId } = await params
  // ── Rate limit (payment window: 5 req / 60 s) ──────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimit(`shop-link-boost:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  // ── Suspension check ───────────────────────────────────────────────────
  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // ── Path param validation ──────────────────────────────────────────────
  if (!isValidUuid(linkId)) {
    return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 })
  }

  try {
    const { payment_key, order_id, boost_days, payment_method } = await req.json()

    if (!payment_key || !order_id || !boost_days) {
      return NextResponse.json(
        { error: 'Required fields missing: payment_key, order_id, boost_days' },
        { status: 400 },
      )
    }

    if (typeof payment_key !== 'string' || payment_key.length > 200) {
      return NextResponse.json({ error: 'Invalid payment_key' }, { status: 400 })
    }
    if (typeof order_id !== 'string' || order_id.length > 200) {
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
    }
    if (!Number.isInteger(boost_days) || (boost_days as number) < 1) {
      return NextResponse.json({ error: 'boost_days must be a positive integer' }, { status: 400 })
    }

    // payment_method는 선택 필드 — 미지정 시 'card' 기본값
    const resolvedMethod: PaymentMethod =
      payment_method && Object.keys(PAYMENT_METHODS).includes(payment_method)
        ? (payment_method as PaymentMethod)
        : 'card'

    if (!BOOST_PRICES[boost_days as number]) {
      return NextResponse.json(
        { error: `boost_days must be one of: ${Object.keys(BOOST_PRICES).join(', ')}` },
        { status: 400 },
      )
    }

    const expectedAmount = BOOST_PRICES[boost_days as number]

    // ── IDOR: link must belong to this host ───────────────────────────────
    const { data: link, error: fetchErr } = await supabaseService
      .from('host_shop_links')
      .select('id, host_id, is_featured, boost_expires_at, status')
      .eq('id', linkId)
      .single()

    if (fetchErr || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (link.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ error: 'Cannot boost an inactive link' }, { status: 409 })
    }

    // ── 이미 활성 부스트가 있으면 거부 ──────────────────────────────────────
    if (link.is_featured && link.boost_expires_at && new Date(link.boost_expires_at) > new Date()) {
      return NextResponse.json(
        { error: 'Active boost already exists', boost_expires_at: link.boost_expires_at },
        { status: 409 },
      )
    }

    // ── 멱등성 키 ─────────────────────────────────────────────────────────
    const idempotencyKey = makeIdempotencyKey('boost', user.id, linkId, order_id)

    const { data: existing } = await supabaseService
      .from('link_boost_payments')
      .select('id, boost_ends_at')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: 'Boost already applied', boost_ends_at: existing.boost_ends_at },
        { status: 200 },
      )
    }

    // ── Toss Payments 결제 검증 ────────────────────────────────────────────
    const tossResult = await verifyTossPayment(payment_key, order_id, expectedAmount)
    if (!tossResult.ok) {
      return NextResponse.json({ error: tossResult.error }, { status: tossResult.statusCode })
    }

    // ── 부스트 적용 (트랜잭션 패턴) ───────────────────────────────────────
    const boostEndsAt = new Date(Date.now() + boost_days * 86_400_000).toISOString()

    const { error: payErr } = await supabaseService
      .from('link_boost_payments')
      .insert({
        host_id: user.id,
        target_type: 'shop_link',
        target_id: linkId,
        boost_days,
        amount: expectedAmount,
        payment_key,
        payment_method: resolvedMethod,
        idempotency_key: idempotencyKey,
        boost_ends_at: boostEndsAt,
      })

    if (payErr) {
      if (payErr.code === '23505') {
        return NextResponse.json({ message: 'Boost already applied' }, { status: 200 })
      }
      return NextResponse.json({ error: 'Failed to record boost payment' }, { status: 500 })
    }

    const { error: updateErr } = await supabaseService
      .from('host_shop_links')
      .update({ is_featured: true, boost_expires_at: boostEndsAt })
      .eq('id', linkId)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to apply boost to link' }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: 'Boost applied successfully',
        boost_days,
        boost_ends_at: boostEndsAt,
        amount: expectedAmount,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
