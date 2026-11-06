import { NextRequest, NextResponse } from 'next/server'
import { calculateCommission } from '@/lib/payments'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'

// 토스페이먼츠 결제 승인 콜백 처리 + 수수료 분배 정산
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`payments-confirm:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  let paymentKey!: string, orderId!: string, amount!: number
  try {
    const body = await request.json()
    paymentKey = body.paymentKey
    orderId = body.orderId
    amount = body.amount
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (!paymentKey || !orderId || amount === undefined) {
      return NextResponse.json({ error: 'Required parameters missing' }, { status: 400 })
    }
    if (typeof paymentKey !== 'string' || paymentKey.length > 200) {
      return NextResponse.json({ error: 'Invalid paymentKey' }, { status: 400 })
    }
    if (typeof orderId !== 'string' || orderId.length > 200) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    // 본인 결제 레코드 조회 (user_id 필터로 IDOR 차단)
    const { data: paymentRecord, error: findError } = await supabaseService
      .from('payments')
      .select('*, events (*, partner_venues (commission_rate))')
      .eq('provider_order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (findError || !paymentRecord) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (paymentRecord.amount !== amount) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
    }

    if (paymentRecord.payment_status === 'completed') {
      return NextResponse.json({ success: true, payment: paymentRecord })
    }

    // 토스페이먼츠 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
    }
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
      // 토스 에러 메시지는 내부 로그에만 기록 — 클라이언트에 직접 노출 금지
      console.error('[payments/confirm] toss error:', tossData.code, tossData.message)
      await supabaseService.from('payments').update({ payment_status: 'failed' }).eq('id', paymentRecord.id)
      return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 400 })
    }

    // 수수료 분배 계산
    const event = paymentRecord.events
    const venueCommissionRate = event?.partner_venues?.commission_rate ?? 0
    const platformFeeRate = event?.platform_fee_rate ?? 15
    const breakdown = calculateCommission(amount, platformFeeRate, venueCommissionRate)

    await supabaseService
      .from('payments')
      .update({
        payment_status: 'completed',
        provider_payment_id: paymentKey,
        platform_fee_amount: breakdown.platformFeeAmount,
        venue_commission_amount: breakdown.venueCommissionAmount,
        host_payout_amount: breakdown.hostPayoutAmount,
      })
      .eq('id', paymentRecord.id)

    // 참가 신청 상태를 승인으로 전환
    await supabaseService
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
    await supabaseService.from('commission_ledger').insert(ledgerEntries)

    return NextResponse.json({ success: true, breakdown })
  } catch (err) {
    console.error('[payments/confirm] unexpected error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
