-- GlobalMatch 사진 인증 스키마 (N+51)
-- photo_verifications: 사진 인증 결과 (민감 PII)
-- RLS: 본인 + service_role(관리자)만 접근

CREATE TABLE IF NOT EXISTS photo_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url           TEXT NOT NULL,
  is_approved         BOOLEAN,
  verification_score  NUMERIC(5,2),
  rejection_reasons   JSONB,
  analysis_data       JSONB,
  verified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_verif_user ON photo_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_verif_pending ON photo_verifications(is_approved) WHERE is_approved IS NULL;

ALTER TABLE photo_verifications ENABLE ROW LEVEL SECURITY;

-- 본인만 본인 인증 기록 조회
DROP POLICY IF EXISTS "users read own verifications" ON photo_verifications;
CREATE POLICY "users read own verifications" ON photo_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT는 service_role만 (서버에서 저장; 클라이언트 직접 저장 차단)
-- service_role은 RLS 우회, WITH CHECK (false)가 anon/authenticated 차단
DROP POLICY IF EXISTS "service only insert verifications" ON photo_verifications;
CREATE POLICY "service only insert verifications" ON photo_verifications
  FOR INSERT WITH CHECK (false);

-- UPDATE: service_role만 (관리자 검토 결과 반영)
-- 사용자는 자신의 인증 결과를 직접 수정할 수 없음
DROP POLICY IF EXISTS "service only update verifications" ON photo_verifications;
CREATE POLICY "service only update verifications" ON photo_verifications
  FOR UPDATE USING (false);
