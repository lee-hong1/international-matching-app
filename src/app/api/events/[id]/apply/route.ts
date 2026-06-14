import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 이벤트 참가 신청: 무료 이벤트는 즉시 승인 대기, 유료 이벤트는 결제용 주문(payment) 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { id: eventId } = await params

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*, partner_venues (commission_rate)')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
  }

  if (event.status !== 'open') {
    return NextResponse.json({ error: '신청할 수 없는 이벤트입니다' }, { status: 400 })
  }

  if (event.participants_count >= event.max_participants) {
    return NextResponse.json({ error: '모집 인원이 마감되었습니다' }, { status: 400 })
  }

  if (event.host_id === user.id) {
    return NextResponse.json({ error: '본인이 만든 이벤트에는 신청할 수 없습니다' }, { status: 400 })
  }

  // 이미 신청했는지 확인
  const { data: existing } = await supabase
    .from('event_participants')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 신청한 이벤트입니다', participant: existing }, { status: 409 })
  }

  // 무료 이벤트: 결제 없이 바로 신청 등록 (승인 대기)
  if (!event.fee_per_person || event.fee_per_person === 0) {
    const { data: participant, error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: user.id, status: 'pending_payment' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ participant, requiresPayment: false }, { status: 201 })
  }

  // 유료 이벤트: 결제 주문 생성 후 토스 결제창으로 연결
  const orderId = `event_${eventId}_${user.id}_${Date.now()}`

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      event_id: eventId,
      amount: event.fee_per_person,
      currency: 'KRW',
      payment_provider: 'toss',
      provider_order_id: orderId,
      payment_status: 'pending',
      description: `이벤트 참가비: ${event.title}`,
    })
    .select()
    .single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? '결제 생성에 실패했습니다' }, { status: 500 })
  }

  const { data: participant, error: participantError } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id, status: 'pending_payment', payment_id: payment.id })
    .select()
    .single()

  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 500 })
  }

  return NextResponse.json({
    participant,
    requiresPayment: true,
    payment: {
      orderId,
      amount: event.fee_per_person,
      orderName: `${event.title} 참가비`,
    },
  }, { status: 201 })
}
