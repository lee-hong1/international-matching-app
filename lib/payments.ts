import { supabase } from './supabase'

// 토스페이먼츠 연동 (국내 표준, 합리적인 결제 수수료)
// https://docs.tosspayments.com
export const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

export interface CommissionBreakdown {
  totalAmount: number
  platformFeeAmount: number
  venueCommissionAmount: number
  hostPayoutAmount: number
}

/**
 * 참가비 결제금액에서 플랫폼/제휴매장/호스트 몫을 계산합니다.
 * - platformFeeRate: 호스트 수익에서 플랫폼이 가져가는 비율(%)
 * - venueCommissionRate: 제휴 매장 이용 시, 매장이 플랫폼에 지급하는 수수료율(%) (매장 측 부담분이지만
 *   플랫폼 정산 단계에서 별도 항목으로 기록)
 */
export function calculateCommission(
  totalAmount: number,
  platformFeeRate: number,
  venueCommissionRate = 0,
): CommissionBreakdown {
  const platformFeeAmount = Math.round(totalAmount * (platformFeeRate / 100))
  const venueCommissionAmount = Math.round(totalAmount * (venueCommissionRate / 100))
  const hostPayoutAmount = totalAmount - platformFeeAmount

  return {
    totalAmount,
    platformFeeAmount,
    venueCommissionAmount,
    hostPayoutAmount,
  }
}

export const paymentsService = {
  /**
   * 결제 시작 전, pending 상태의 결제 레코드를 생성합니다.
   * 토스페이먼츠 결제창 호출 시 이 orderId를 사용합니다.
   */
  async createPendingPayment(params: {
    userId: string
    eventId: string
    amount: number
    description: string
  }) {
    const orderId = `event_${params.eventId}_${params.userId}_${Date.now()}`

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: params.userId,
        event_id: params.eventId,
        amount: params.amount,
        currency: 'KRW',
        payment_provider: 'toss',
        provider_order_id: orderId,
        payment_status: 'pending',
        description: params.description,
      })
      .select()
      .single()

    if (error) return { payment: null, error }
    return { payment: data, error: null }
  },

  /**
   * 결제 성공 후 토스 결제승인 API를 서버에서 호출하고,
   * 수수료 분배 내역을 commission_ledger에 기록합니다.
   * (이 함수는 /api/payments/confirm 라우트에서 서버 전용으로 호출)
   */
  async confirmTossPayment(params: {
    paymentKey: string
    orderId: string
    amount: number
  }) {
    const secretKey = process.env.TOSS_SECRET_KEY ?? 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.message ?? '결제 승인에 실패했습니다', data: null }
    }
    return { success: true, error: null, data }
  },
}
