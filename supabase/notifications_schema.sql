-- GlobalMatch 알림 스키마 (N+48)
-- notifications, device_tokens, notification_settings 테이블
-- RLS: 본인 데이터만 접근 가능 (IDOR 방지)

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('match','message','like','profile_view','system')),
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body         TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  data         JSONB,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회
DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT는 service_role만 (서버에서 생성; 클라이언트가 임의 user_id로 알림 생성 금지)
DROP POLICY IF EXISTS "service role insert notifications" ON notifications;
CREATE POLICY "service role insert notifications" ON notifications
  FOR INSERT WITH CHECK (false); -- anon/authenticated 차단, service_role은 RLS 우회

-- 본인 알림만 읽음 처리 (UPDATE)
DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 알림만 삭제
DROP POLICY IF EXISTS "users delete own notifications" ON notifications;
CREATE POLICY "users delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ── device_tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  device_type  TEXT NOT NULL CHECK (device_type IN ('web','ios','android')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- 본인 토큰만 조회·수정·삭제
DROP POLICY IF EXISTS "users manage own device tokens" ON device_tokens;
CREATE POLICY "users manage own device tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── notification_settings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matches       BOOLEAN NOT NULL DEFAULT true,
  messages      BOOLEAN NOT NULL DEFAULT true,
  likes         BOOLEAN NOT NULL DEFAULT true,
  profile_views BOOLEAN NOT NULL DEFAULT true,
  marketing     BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 본인 설정만 접근
DROP POLICY IF EXISTS "users manage own notification settings" ON notification_settings;
CREATE POLICY "users manage own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
