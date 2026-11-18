-- 커미션 트랜잭션 테이블
-- 외부 링크 클릭 → 구매 전환 추적 (추후 affiliate webhook 연동)
-- host_shop_links 테이블이 먼저 존재해야 함 (supabase/commerce_schema.sql)

CREATE TABLE IF NOT EXISTS commission_transactions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id      UUID        NOT NULL REFERENCES host_shop_links(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'KRW',
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  external_ref TEXT,                        -- 외부 주문번호/트랜잭션 ID
  created_at   TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- RLS 활성화 (모든 Supabase 테이블 필수)
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;

-- 호스트: 자신의 링크에 대한 커미션만 조회
CREATE POLICY "host_read_own_commissions" ON commission_transactions
  FOR SELECT TO authenticated
  USING (
    link_id IN (
      SELECT id FROM host_shop_links WHERE host_id = auth.uid()
    )
  );

-- service_role만 삽입 가능 (affiliate webhook 처리 시)
CREATE POLICY "service_insert_commissions" ON commission_transactions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- service_role만 상태 업데이트 가능
CREATE POLICY "service_update_commissions" ON commission_transactions
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_commissions_link_id    ON commission_transactions (link_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id    ON commission_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status     ON commission_transactions (status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commission_transactions (created_at DESC);
