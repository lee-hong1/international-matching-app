import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const BOOST_AMOUNT = 9900
const BOOST_HOURS = 24

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

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
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

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
    return NextResponse.json({ error: '모임을 찾을 수 없습니다' }, { status: 404 })
  }

  if (event.host_id !== user.id) {
    return NextResponse.json({ error: '호스트만 부스트를 신청할 수 있습니다' }, { status: 403 })
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
    return NextResponse.json({ error: '부스트 생성에 실패했습니다' }, { status: 500 })
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
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { id: eventId } = await params
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  const { paymentKey, orderId, amount } = await request.json()

  if (!paymentKey || !orderId || amount === undefined) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 })
  }

  const { data: boost, error: boostError } = await supabaseService
    .from('event_boosts')
    .select('*')
    .eq('toss_order_id', orderId)
    .eq('host_id', user.id)
    .single()

  if (boostError || !boost) {
    return NextResponse.json({ error: '부스트 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  if (boost.amount !== amount) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
  }

  // Confirm with Toss Payments
  const secretKey = process.env.TOSS_SECRET_KEY ?? 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'
  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!tossRes.ok) {
    const tossData = await tossRes.json()
    return NextResponse.json({ error: tossData.message ?? '결제 승인에 실패했습니다' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + BOOST_HOURS * 60 * 60 * 1000).toISOString()

  await supabaseService.from('event_boosts').update({
    toss_payment_key: paymentKey,
    status: 'paid',
    expires_at: expiresAt,
  }).eq('id', boost.id)

  await supabaseService.from('events').update({
    is_featured: true,
    boost_expires_at: expiresAt,
  }).eq('id', eventId)

  return NextResponse.json({ success: true, expiresAt })
}
