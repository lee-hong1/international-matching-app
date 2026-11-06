/**
 * 결제 공유 헬퍼 — Toss Payments 검증 + 멱등성 키 생성
 * 모든 boost route에서 공유.
 */

export const PAYMENT_METHODS = {
  card: '카드',
  kakaopay: '카카오페이',
  tosspay: '토스페이',
  naverpay: '네이버페이',
} as const

export type PaymentMethod = keyof typeof PAYMENT_METHODS

export interface TossPaymentResult {
  status: string
  orderId: string
  totalAmount: number
  /** easyPay 결제 수단 정보 (카카오페이/토스페이/네이버페이 등) */
  easyPay?: {
    provider: string
    amount: number
    discountAmount: number
  }
  /** 일반 카드 결제 정보 */
  card?: {
    company: string
    number: string
    installmentPlanMonths: number
  }
}

export interface TossVerifySuccess {
  ok: true
  data: TossPaymentResult
}

export interface TossVerifyFailure {
  ok: false
  statusCode: number
  error: string
}

export type TossVerifyResult = TossVerifySuccess | TossVerifyFailure

/** Toss Payments paymentKey로 결제 상태를 검증한다. */
export async function verifyTossPayment(
  paymentKey: string,
  orderId: string,
  expectedAmount: number,
): Promise<TossVerifyResult> {
  const tossSecretKey = process.env.TOSS_SECRET_KEY
  if (!tossSecretKey) {
    return { ok: false, statusCode: 500, error: '결제 설정 오류' }
  }

  let res: Response
  try {
    res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
        },
      },
    )
  } catch {
    return { ok: false, statusCode: 502, error: '결제 서버 연결 실패' }
  }

  if (!res.ok) {
    return { ok: false, statusCode: 402, error: '결제 검증 실패' }
  }

  const data = await res.json() as TossPaymentResult

  if (data.status !== 'DONE') {
    return { ok: false, statusCode: 402, error: '결제가 완료되지 않았습니다' }
  }

  if (data.orderId !== orderId) {
    return { ok: false, statusCode: 400, error: '주문 ID 불일치' }
  }

  if (data.totalAmount !== expectedAmount) {
    return { ok: false, statusCode: 400, error: `결제 금액 불일치. 예상: ${expectedAmount}원` }
  }

  // easyPay(카카오페이/토스페이/네이버페이) 결제 금액 재검증
  // easyPay.amount = 실제 결제 금액, discountAmount = 할인 금액 (합산 = totalAmount)
  if (data.easyPay && data.easyPay.amount + data.easyPay.discountAmount !== expectedAmount) {
    return { ok: false, statusCode: 400, error: 'easyPay 결제 금액 불일치' }
  }

  return { ok: true, data }
}

/** 멱등성 키 생성 — `{resource}_{...parts}` 형식. */
export function makeIdempotencyKey(resource: string, ...parts: string[]): string {
  return [resource, ...parts].join('_')
}

export interface CommissionBreakdown {
  platformFeeAmount: number
  venueCommissionAmount: number
  hostPayoutAmount: number
}

/**
 * 결제 금액에서 플랫폼 수수료 + 파트너 베뉴 커미션을 계산하고
 * 호스트 정산 금액을 반환한다.
 *
 * @param amount - 총 결제 금액 (원 단위 정수)
 * @param platformFeeRate - 플랫폼 수수료율 (기본 15%)
 * @param venueCommissionRate - 파트너 베뉴 커미션율 (파트너 베뉴 없으면 0)
 */
export function calculateCommission(
  amount: number,
  platformFeeRate: number,
  venueCommissionRate: number,
): CommissionBreakdown {
  const platformFeeAmount = Math.round(amount * platformFeeRate / 100)
  const venueCommissionAmount = Math.round(amount * venueCommissionRate / 100)
  const hostPayoutAmount = amount - platformFeeAmount - venueCommissionAmount
  return { platformFeeAmount, venueCommissionAmount, hostPayoutAmount }
}
