-- GlobalMatch 이메일 시스템 스키마 (N+55)
-- email_templates, email_jobs, email_campaigns, email_preferences
-- RLS: 사용자는 본인 선호도만; 나머지는 service_role 전용

-- ── email_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
  subject     TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables   JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name) WHERE is_active = true;

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 인증 사용자: 활성 템플릿 조회 (이메일 발송 시 조회 필요)
DROP POLICY IF EXISTS "authenticated read active templates" ON email_templates;
CREATE POLICY "authenticated read active templates" ON email_templates
  FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- 쓰기: service_role만
DROP POLICY IF EXISTS "service only write templates" ON email_templates;
CREATE POLICY "service only write templates" ON email_templates
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "service only update templates" ON email_templates;
CREATE POLICY "service only update templates" ON email_templates
  FOR UPDATE USING (false);

-- ── email_jobs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email   TEXT NOT NULL CHECK (char_length(recipient_email) BETWEEN 1 AND 254),
  recipient_name    TEXT,
  template_id       UUID NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  template_variables JSONB,
  scheduled_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  sent_at           TIMESTAMPTZ,
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_jobs_status   ON email_jobs(status, scheduled_at NULLS FIRST) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_jobs_sent     ON email_jobs(sent_at DESC) WHERE status = 'sent';

ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;

-- email_jobs: service_role만 (큐 처리는 서버 전용)
DROP POLICY IF EXISTS "service only email_jobs" ON email_jobs;
CREATE POLICY "service only email_jobs" ON email_jobs
  FOR ALL USING (false) WITH CHECK (false);

-- ── email_campaigns ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  subject            TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  template_id        UUID NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  recipient_filter   JSONB,
  scheduled_at       TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  total_recipients   INTEGER NOT NULL DEFAULT 0,
  sent_count         INTEGER NOT NULL DEFAULT 0,
  opened_count       INTEGER NOT NULL DEFAULT 0,
  clicked_count      INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status, scheduled_at);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- email_campaigns: service_role만 (관리자 대시보드)
DROP POLICY IF EXISTS "service only email_campaigns" ON email_campaigns;
CREATE POLICY "service only email_campaigns" ON email_campaigns
  FOR ALL USING (false) WITH CHECK (false);

-- ── email_preferences ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_preferences (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  match_notifications  BOOLEAN NOT NULL DEFAULT true,
  message_notifications BOOLEAN NOT NULL DEFAULT true,
  newsletter           BOOLEAN NOT NULL DEFAULT false,
  promotional          BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- 본인 선호도만 관리
DROP POLICY IF EXISTS "users manage own email prefs" ON email_preferences;
CREATE POLICY "users manage own email prefs" ON email_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
