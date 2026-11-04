/**
 * POST /api/shop-links/[id]/boost
 *
 * 호스트가 자신의 쇼핑 링크를 유료로 추천(Featured) 상단 노출합니다.
 * Toss Payments 결제 완료 후 호출 — paymentKey + orderId 검증.
 *
 * 보안: JWT 인증 → host_id = user.id IDOR 차단 → 멱등성 키 충돌 방지.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, getAuthUser, isValidUuid, BOOST_PRICES } from '@/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'
import { verifyTossPayment, makeIdempotencyKey, PAYMENT_METHODS, type PaymentMethod } from '@/lib/payments'
import { isSuspended } from '@/lib/suspended-check'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── Rate limit (payment window: 5 req / 60 s) ──────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimit(ip, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json(
      { error: '인증이 필요합니다 / Authentication required' },
      { status: 401 },
    )
  }

  // ── Suspension check ───────────────────────────────────────────────────
  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: '계정이 정지된 상태입니다 / Account suspended' }, { status: 403 })
  }

  // ── Path param validation ──────────────────────────────────────────────
  const linkId = params.id
  if (!isValidUuid(linkId)) {
    return NextResponse.json({ error: '유효하지 않은 링크 ID입니다' }, { status: 400 })
  }

  try {
    const { payment_key, order_id, boost_days, payment_method } = await req.json()

    if (!payment_key || !order_id || !boost_days) {
      return NextResponse.json(
        { error: '필수 항목 누락: payment_key, order_id, boost_days' },
        { status: 400 },
      )
    }

    // payment_method는 선택 필드 — 미지정 시 'card' 기본값
    const resolvedMethod: PaymentMethod =
      payment_method && Object.keys(PAYMENT_METHODS).includes(payment_method)
        ? (payment_method as PaymentMethod)
        : 'card'

    if (!BOOST_PRICES[boost_days as number]) {
      return NextResponse.json(
        { error: `boost_days는 다음 중 하나: ${Object.keys(BOOST_PRICES).join(', ')}` },
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
      return NextResponse.json({ error: '링크를 찾을 수 없습니다' }, { status: 404 })
    }

    if (link.host_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ error: '비활성 링크는 부스팅할 수 없습니다' }, { status: 409 })
    }

    // ── 이미 활성 부스트가 있으면 거부 ──────────────────────────────────────
    if (link.is_featured && link.boost_expires_at && new Date(link.boost_expires_at) > new Date()) {
      return NextResponse.json(
        { error: '이미 활성 부스트가 있습니다', boost_expires_at: link.boost_expires_at },
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
        { message: '이미 처리된 부스트입니다', boost_ends_at: existing.boost_ends_at },
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
        return NextResponse.json({ message: '이미 처리된 부스트입니다' }, { status: 200 })
      }
      return NextResponse.json({ error: payErr.message }, { status: 500 })
    }

    const { error: updateErr } = await supabaseService
      .from('host_shop_links')
      .update({ is_featured: true, boost_expires_at: boostEndsAt })
      .eq('id', linkId)

    if (updateErr) {
      return NextResponse.json({ error: '부스트 적용 오류: ' + updateErr.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: '부스트가 적용되었습니다',
        boost_days,
        boost_ends_at: boostEndsAt,
        amount: expectedAmount,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
