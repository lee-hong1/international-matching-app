import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

const BOOST_AMOUNT = 9900
const BOOST_HOURS = 24

// POST /api/events/[id]/boost — initiate boost payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`event-boost:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 결제 기능은 성인 인증 필수
  const { data: boostProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!boostProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  const { id: eventId } = await params
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabaseService
    .from('events')
    .select('id, host_id, title')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can boost this event' }, { status: 403 })
  }

  // 활성 부스트 중복 방지
  const { data: activeBoost } = await supabaseService
    .from('event_boosts')
    .select('id, expires_at')
    .eq('event_id', eventId)
    .eq('status', 'paid')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (activeBoost) {
    return NextResponse.json({ error: 'Active boost already exists', expiresAt: activeBoost.expires_at }, { status: 409 })
  }

  const tossOrderId = `boost-${eventId}-${Date.now()}`

  const { error: insertError } = await supabaseService.from('event_boosts').insert({
    event_id: eventId,
    host_id: user.id,
    amount: BOOST_AMOUNT,
    toss_order_id: tossOrderId,
    boost_hours: BOOST_HOURS,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create boost' }, { status: 500 })
  }

  return NextResponse.json({
    orderId: tossOrderId,
    amount: BOOST_AMOUNT,
    orderName: `모임 상단 노출 (${BOOST_HOURS}시간) - ${event.title}`,
  })
}

// PATCH /api/events/[id]/boost — confirm boost after Toss payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const patchRl = await checkRateLimit(`event-boost-confirm:${ip}`, 'payment')
  if (!patchRl.allowed) {
    const r = rateLimitResponse(patchRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  const { id: eventId } = await params
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  let paymentKey: string, orderId: string, amount: number
  try {
    const body = await request.json()
    paymentKey = body.paymentKey
    orderId = body.orderId
    amount = body.amount
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!paymentKey || typeof paymentKey !== 'string' || paymentKey.length > 200 || !orderId || typeof orderId !== 'string' || orderId.length > 200 || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Required parameters missing or invalid' }, { status: 400 })
  }

  const { data: boost, error: boostError } = await supabaseService
    .from('event_boosts')
    .select('*')
    .eq('toss_order_id', orderId)
    .eq('host_id', user.id)
    .single()

  if (boostError || !boost) {
    return NextResponse.json({ error: 'Boost not found' }, { status: 404 })
  }

  if (boost.amount !== amount) {
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
  }

  // 멱등성: 이미 결제 완료된 boost는 재처리 없이 성공 반환
  if (boost.status === 'paid') {
    return NextResponse.json({ success: true, expiresAt: boost.expires_at })
  }

  // Confirm with Toss Payments
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
  }
  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!tossRes.ok) {
    let tossCode = 'UNKNOWN'
    try {
      const tossData = await tossRes.json()
      tossCode = tossData.code ?? 'UNKNOWN'
      console.error('[event-boost/PATCH] toss error:', tossCode, tossData.message)
    } catch {
      console.error('[event-boost/PATCH] toss error: non-JSON response', tossRes.status)
    }
    return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + BOOST_HOURS * 60 * 60 * 1000).toISOString()

  const { error: boostUpdateErr } = await supabaseService.from('event_boosts').update({
    toss_payment_key: paymentKey,
    status: 'paid',
    expires_at: expiresAt,
  }).eq('id', boost.id)

  if (boostUpdateErr) {
    console.error('[event-boost/PATCH] boost update failed:', boostUpdateErr.code, 'boost_id:', boost.id)
    return NextResponse.json({ error: 'Failed to record boost payment' }, { status: 500 })
  }

  const { error: eventUpdateErr } = await supabaseService.from('events').update({
    is_featured: true,
    boost_expires_at: expiresAt,
  }).eq('id', eventId)

  if (eventUpdateErr) {
    console.error('[event-boost/PATCH] event update failed:', eventUpdateErr.code)
  }

  return NextResponse.json({ success: true, expiresAt })
}
