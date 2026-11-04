-- 관리자 감사 로그 테이블
-- 계정 정지/해제 기록 — service_role 전용

CREATE TABLE IF NOT EXISTS admin_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_key_hash   TEXT        NOT NULL,  -- SHA-256(ADMIN_API_KEY) 앞 16자, 역산 불가
  target_user_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action           TEXT        NOT NULL CHECK (action IN ('suspend', 'unsuspend')),
  reason           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

-- RLS: 외부(일반 사용자) 접근 완전 차단, service_role만 허용
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_select" ON admin_actions
  FOR SELECT USING (false);

CREATE POLICY "service_role_only_insert" ON admin_actions
  FOR INSERT WITH CHECK (false);

CREATE POLICY "service_role_only_update" ON admin_actions
  FOR UPDATE USING (false);

CREATE POLICY "service_role_only_delete" ON admin_actions
  FOR DELETE USING (false);
