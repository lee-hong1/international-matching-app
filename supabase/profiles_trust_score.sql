-- ============================================================
-- 호스트 신뢰도 점수 & 뱃지 시스템
-- trust_score: 0–100 (높을수록 신뢰도 높음)
-- trust_badge: none → verified → premium → elite
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0
    CHECK (trust_score >= 0 AND trust_score <= 100),
  ADD COLUMN IF NOT EXISTS trust_badge TEXT NOT NULL DEFAULT 'none'
    CHECK (trust_badge IN ('none', 'verified', 'premium', 'elite'));

-- 조회 성능을 위한 인덱스 (신뢰도 높은 호스트 우선 노출)
CREATE INDEX IF NOT EXISTS idx_profiles_trust
  ON profiles (trust_score DESC)
  WHERE trust_score > 0;

-- ── RLS 정책 ──────────────────────────────────────────────────────────────────

-- trust_score/trust_badge는 authenticated 사용자 조회 가능
-- 단, 미성년자 프로필은 본인 외 차단 (age_verification.sql 정책과 일관성 유지)
-- USING (TRUE) 금지: age_verification adult_users_only_visible 정책을 OR로 우회하게 됨
CREATE POLICY "authenticated_read_trust_fields"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_adult IS TRUE OR auth.uid() = id);

-- trust_score/trust_badge 직접 UPDATE 차단 (서브쿼리로 현재 값 고정)
-- service_role은 RLS bypass이므로 함수/웹훅에서만 변경 가능
CREATE POLICY "only_service_role_update_trust"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND trust_score = (SELECT p.trust_score FROM profiles p WHERE p.id = auth.uid())
    AND trust_badge = (SELECT p.trust_badge FROM profiles p WHERE p.id = auth.uid())
  );

-- ── 뱃지 자동 계산 함수 ────────────────────────────────────────────────────────
-- trust_score 변경 시 trust_badge 자동 갱신 트리거
CREATE OR REPLACE FUNCTION sync_trust_badge()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.trust_badge := CASE
    WHEN NEW.trust_score >= 90 THEN 'elite'
    WHEN NEW.trust_score >= 70 THEN 'premium'
    WHEN NEW.trust_score >= 40 THEN 'verified'
    ELSE 'none'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trust_badge ON profiles;
CREATE TRIGGER trg_sync_trust_badge
  BEFORE UPDATE OF trust_score ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_trust_badge();

-- ── trust_score 증가/감소 함수 (service_role 전용) ───────────────────────────
CREATE OR REPLACE FUNCTION adjust_trust_score(
  p_user_id UUID,
  p_delta    INTEGER,       -- 양수: 증가, 음수: 감소
  p_reason   TEXT DEFAULT NULL
)
RETURNS INTEGER             -- 적용 후 trust_score 반환
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  UPDATE profiles
  SET trust_score = GREATEST(0, LEAST(100, trust_score + p_delta))
  WHERE id = p_user_id
  RETURNING trust_score INTO v_new_score;

  RETURN v_new_score;
END;
$$;

REVOKE ALL ON FUNCTION adjust_trust_score(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_trust_score(UUID, INTEGER, TEXT) TO service_role;

-- ── 뱃지별 trust_score 임계값 참조 뷰 ─────────────────────────────────────────
-- 프론트엔드/관리자 도구에서 활용
CREATE OR REPLACE VIEW trust_badge_thresholds AS
SELECT 'elite'::TEXT AS badge, 90 AS min_score, 100 AS max_score
UNION ALL
SELECT 'premium', 70, 89
UNION ALL
SELECT 'verified', 40, 69
UNION ALL
SELECT 'none', 0, 39;
