-- ============================================================
-- 연령 검증 — 청소년보호법 준수 (만 19세 미만 가입 차단)
-- ============================================================

-- profiles 테이블에 birth_date 컬럼 추가 (없을 경우)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS is_adult BOOLEAN GENERATED ALWAYS AS (
    birth_date IS NOT NULL AND (CURRENT_DATE - birth_date) >= 365 * 19
  ) STORED;

-- 미성년자 차단 CHECK 제약
ALTER TABLE profiles
  ADD CONSTRAINT chk_adult_only
    CHECK (birth_date IS NULL OR (CURRENT_DATE - birth_date) >= 365 * 19);

-- 호스트 등록 시 성인 여부 재검증 (온보딩 완료 차단 트리거)
CREATE OR REPLACE FUNCTION enforce_adult_on_host_register()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.user_id AND (is_adult IS NOT TRUE)
  ) THEN
    RAISE EXCEPTION 'UNDERAGE: host registration blocked (청소년보호법)';
  END IF;
  RETURN NEW;
END;
$$;

-- host_profiles 테이블이 있다면 트리거 적용 (테이블명은 실제 스키마에 맞게 조정)
-- DROP TRIGGER IF EXISTS trg_adult_host ON host_profiles;
-- CREATE TRIGGER trg_adult_host
--   BEFORE INSERT ON host_profiles
--   FOR EACH ROW EXECUTE FUNCTION enforce_adult_on_host_register();

-- ── RLS: 미성년자 프로필은 본인만 조회 가능, 타인 열람 불가 ──────────────────
-- (기존 profiles RLS에 추가)

-- 미성년자 행 조회 차단 (서비스 롤만 접근 가능)
CREATE POLICY "adult_users_only_visible"
  ON profiles
  FOR SELECT
  USING (is_adult IS TRUE OR auth.uid() = id);

-- ── 가입 시 연령 검증 거부 로그 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS age_verification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result      TEXT NOT NULL CHECK (result IN ('passed', 'blocked')),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL
  -- 생년월일은 절대 저장 금지 — 개인정보보호법
);

ALTER TABLE age_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_insert_age_log"
  ON age_verification_logs
  FOR INSERT
  WITH CHECK (FALSE); -- 서비스 롤에서만 삽입 (direct INSERT 차단)

CREATE POLICY "user_can_read_own_age_log"
  ON age_verification_logs
  FOR SELECT
  USING (user_id = auth.uid());
