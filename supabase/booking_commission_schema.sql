-- 예약 커미션 테이블 (플랫폼 수수료 15%)
-- booking completed 시 자동 생성. booking_id UNIQUE → 멱등성 보장

CREATE TABLE IF NOT EXISTS booking_commissions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  host_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gross_amount     NUMERIC(12,2) NOT NULL CHECK (gross_amount > 0),
  commission_rate  NUMERIC(5,4) NOT NULL DEFAULT 0.15 CHECK (commission_rate BETWEEN 0 AND 1),
  commission_amount NUMERIC(12,2) NOT NULL,
  net_amount       NUMERIC(12,2) NOT NULL,
  currency         TEXT        NOT NULL DEFAULT 'KRW',
  status           TEXT        NOT NULL DEFAULT 'settled'
                               CHECK (status IN ('settled', 'reversed')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화 (모든 Supabase 테이블 필수)
ALTER TABLE booking_commissions ENABLE ROW LEVEL SECURITY;

-- 호스트: 자신의 커미션만 조회
CREATE POLICY "host_read_own_booking_commissions" ON booking_commissions
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

-- service_role만 삽입 가능
CREATE POLICY "service_insert_booking_commissions" ON booking_commissions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- service_role만 상태 업데이트 가능 (환불 처리 등)
CREATE POLICY "service_update_booking_commissions" ON booking_commissions
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_booking_commissions_booking_id ON booking_commissions (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_commissions_host_id    ON booking_commissions (host_id);
CREATE INDEX IF NOT EXISTS idx_booking_commissions_created_at ON booking_commissions (created_at DESC);
