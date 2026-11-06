/**
 * POST /api/sales-events/[id]/boost
 *
 * 호스트가 자신의 판매 이벤트를 유료로 추천(Featured) 상단 노출합니다.
 * shop-links boost와 동일한 Toss Payments 검증 패턴.
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
  const { id: eventId } = await params
  // ── Rate limit ─────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimit(`sales-event-boost:${ip}`, 'payment')
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
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  try {
    const { payment_key, order_id, boost_days, payment_method } = await req.json()

    if (!payment_key || !order_id || !boost_days) {
      return NextResponse.json(
        { error: 'Required fields missing: payment_key, order_id, boost_days' },
        { status: 400 },
      )
    }

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

    // ── IDOR: event must belong to this host ──────────────────────────────
    const { data: event, error: fetchErr } = await supabaseService
      .from('sales_events')
      .select('id, host_id, status, is_featured, boost_expires_at, ends_at')
      .eq('id', eventId)
      .single()

    if (fetchErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.host_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['upcoming', 'active'].includes(event.status)) {
      return NextResponse.json({ error: 'Cannot boost an event that is not active' }, { status: 409 })
    }

    // 이벤트 종료 후 부스팅 금지
    if (new Date(event.ends_at) <= new Date()) {
      return NextResponse.json({ error: 'Event has already ended' }, { status: 409 })
    }

    // ── 이미 활성 부스트 ──────────────────────────────────────────────────
    if (event.is_featured && event.boost_expires_at && new Date(event.boost_expires_at) > new Date()) {
      return NextResponse.json(
        { error: 'Active boost already exists', boost_expires_at: event.boost_expires_at },
        { status: 409 },
      )
    }

    // ── 멱등성 키 ─────────────────────────────────────────────────────────
    const idempotencyKey = makeIdempotencyKey('boost', user.id, eventId, order_id)

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

    // ── 부스트 적용 ────────────────────────────────────────────────────────
    const boostEndsAt = new Date(Date.now() + boost_days * 86_400_000).toISOString()

    const { error: payErr } = await supabaseService
      .from('link_boost_payments')
      .insert({
        host_id: user.id,
        target_type: 'sales_event',
        target_id: eventId,
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
      .from('sales_events')
      .update({ is_featured: true, boost_expires_at: boostEndsAt })
      .eq('id', eventId)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to apply boost to event' }, { status: 500 })
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
