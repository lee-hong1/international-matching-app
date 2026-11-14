-- bookings 테이블에 Stripe payment_intent_id 추가 (Loop④ 수익 누수 방지)
-- 예약 결제를 Stripe와 연결하여 취소 시 자동 환불 처리 가능하게 함
-- payment_intent_id 없이 cancelled 처리되면 환불 추적 불가 → 수익 누수 위험

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status    TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partially_refunded', 'failed'));

-- payment_intent_id 인덱스 (Stripe webhook에서 조회)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent
  ON bookings(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

-- payment_status 인덱스 (미결제 예약 조회)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status)
  WHERE payment_status = 'unpaid';

-- RLS: 기존 정책 유지 (새 컬럼은 SELECT/UPDATE 정책에 자동 포함)
-- payment_intent_id는 service role만 쓸 수 있어야 함 (사용자가 직접 변경 불가)
-- → API 라우트는 항상 supabaseService(service role)를 통해서만 업데이트

COMMENT ON COLUMN bookings.payment_intent_id IS 'Stripe PaymentIntent ID — 취소 시 환불 추적용';
COMMENT ON COLUMN bookings.payment_status IS 'unpaid: 결제 전(예약만), paid: 결제 완료, refunded: 전액 환불, partially_refunded: 부분 환불, failed: 결제 실패';
