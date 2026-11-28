-- GlobalMatch 안전 조치 스키마 (N+52)
-- safety_actions: 관리자 처분 기록 (임시정지, 영구정지, 프로필 검토)
-- RLS: service_role만 쓰기, 본인 기록 읽기 허용 (처분 사유 고지 의무)

CREATE TABLE IF NOT EXISTS safety_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning','temporary_ban','permanent_ban','profile_review','content_removal')),
  reason      TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  duration    INTEGER, -- hours for temporary_ban
  applied_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_safety_actions_user ON safety_actions(user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_actions_type ON safety_actions(action_type, applied_at DESC);

ALTER TABLE safety_actions ENABLE ROW LEVEL SECURITY;

-- 본인에게 적용된 처분 기록 조회 (처분 사유 고지 의무)
DROP POLICY IF EXISTS "users read own safety actions" ON safety_actions;
CREATE POLICY "users read own safety actions" ON safety_actions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: service_role만 (관리자 전용)
-- WITH CHECK (false) → anon/authenticated 차단, service_role은 RLS 우회
DROP POLICY IF EXISTS "service only write safety actions" ON safety_actions;
CREATE POLICY "service only write safety actions" ON safety_actions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "service only update safety actions" ON safety_actions;
CREATE POLICY "service only update safety actions" ON safety_actions
  FOR UPDATE USING (false);
