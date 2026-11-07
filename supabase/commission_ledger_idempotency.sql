-- commission_ledger: (payment_id, recipient_type) UNIQUE 제약
-- 결제 확인 API의 멱등성 보장 — 동일 결제에 같은 수신자 유형이 중복 삽입되지 않도록
-- 기존 중복 데이터가 있을 경우 migration 전에 정리 필요

-- 중복 제거 (있는 경우) — CTE로 가장 오래된 행 1개만 유지
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY payment_id, recipient_type ORDER BY created_at) AS rn
  FROM commission_ledger
)
DELETE FROM commission_ledger
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- UNIQUE 인덱스 생성 (IF NOT EXISTS로 재실행 안전)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_payment_recipient
  ON commission_ledger(payment_id, recipient_type);
