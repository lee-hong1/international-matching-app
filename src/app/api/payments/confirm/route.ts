import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateCommission } from '@/lib/payments'

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

// 토스페이먼츠 결제 승인 콜백 처리 + 수수료 분배 정산
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const { paymentKey, orderId, amount } = await request.json()
    if (!paymentKey || !orderId || amount === undefined) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 })
    }

    const { data: paymentRecord, error: findError } = await supabase
      .from('payments')
      .select('*, events (*, partner_venues (commission_rate))')
      .eq('provider_order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (findError || !paymentRecord) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    if (paymentRecord.amount !== amount) {
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
    }

    if (paymentRecord.payment_status === 'completed') {
      return NextResponse.json({ success: true, payment: paymentRecord })
    }

    // 토스페이먼츠 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY ?? 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const tossData = await tossRes.json()
    if (!tossRes.ok) {
      await supabase.from('payments').update({ payment_status: 'failed' }).eq('id', paymentRecord.id)
      return NextResponse.json({ error: tossData.message ?? '결제 승인에 실패했습니다' }, { status: 400 })
    }

    // 수수료 분배 계산
    const event = paymentRecord.events
    const venueCommissionRate = event?.partner_venues?.commission_rate ?? 0
    const platformFeeRate = event?.platform_fee_rate ?? 15
    const breakdown = calculateCommission(amount, platformFeeRate, venueCommissionRate)

    await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        provider_payment_id: paymentKey,
        platform_fee_amount: breakdown.platformFeeAmount,
        venue_commission_amount: breakdown.venueCommissionAmount,
        host_payout_amount: breakdown.hostPayoutAmount,
      })
      .eq('id', paymentRecord.id)

    // 참가 신청 상태를 승인 대기 -> 승인으로 전환
    await supabase
      .from('event_participants')
      .update({ status: 'approved' })
      .eq('payment_id', paymentRecord.id)

    // 수수료 정산 원장 기록
    const ledgerEntries: any[] = [
      { payment_id: paymentRecord.id, recipient_type: 'platform', recipient_id: null, amount: breakdown.platformFeeAmount },
      { payment_id: paymentRecord.id, recipient_type: 'host', recipient_id: event.host_id, amount: breakdown.hostPayoutAmount },
    ]
    if (event?.venue_type === 'partner' && event.venue_id) {
      ledgerEntries.push({
        payment_id: paymentRecord.id,
        recipient_type: 'venue',
        recipient_id: event.venue_id,
        amount: breakdown.venueCommissionAmount,
      })
    }
    await supabase.from('commission_ledger').insert(ledgerEntries)

    return NextResponse.json({ success: true, breakdown })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
