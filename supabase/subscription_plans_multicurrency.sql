-- GlobalMatch 다국어 결제 지원 스키마 (Cycle 9 LOOP A fix)
-- subscription_plans에 JPY/CNY 가격 컬럼 추가, profiles에 country 컬럼 추가
-- 적용 후 각 플랜의 price_jpy / price_cny를 수동으로 SET해야 함.

-- ── subscription_plans: 통화별 가격 ───────────────────────────────────────────
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_jpy INTEGER,          -- JPY 단가 (무소수점)
  ADD COLUMN IF NOT EXISTS price_cny DECIMAL(10, 2);   -- CNY 단가 (소수점 2자리)

-- price_jpy / price_cny가 NULL이면 checkout API는 KRW fallback 사용.
-- 설정 예시 (플랜 ID는 실제 값으로 교체):
-- UPDATE subscription_plans SET price_jpy = 4980, price_cny = 238.00 WHERE name = 'Basic';
-- UPDATE subscription_plans SET price_jpy = 9800, price_cny = 468.00 WHERE name = 'Premium';

-- ── profiles: 국가 코드 ──────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country CHAR(2);  -- ISO 3166-1 alpha-2 (KR, JP, CN, US …)

-- RLS: 본인만 country 갱신 가능 (service role은 항상 가능)
DROP POLICY IF EXISTS "users update own country" ON profiles;
CREATE POLICY "users update own country" ON profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
