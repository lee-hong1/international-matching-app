/**
 * 결제 공유 헬퍼 — Toss Payments 검증 + 멱등성 키 생성
 * 모든 boost route에서 공유.
 */

export interface TossPaymentResult {
  status: string
  orderId: string
  totalAmount: number
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

  return { ok: true, data }
}

/** 멱등성 키 생성 — `{resource}_{...parts}` 형식. */
export function makeIdempotencyKey(resource: string, ...parts: string[]): string {
  return [resource, ...parts].join('_')
}
