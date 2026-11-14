-- Contact form submissions table (for /api/contact endpoint)
-- RLS: 일반 사용자는 READ 불가, 어드민만 접근

CREATE TABLE IF NOT EXISTS contact_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text NOT NULL DEFAULT 'general',
  message     text NOT NULL,
  ip_address  text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 어드민만 접근 — 일반 사용자 완전 차단
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_contact_requests"
  ON contact_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_admin = true
    )
  );

-- 미인증(anon) INSERT도 허용 — contact 폼은 로그인 불필요
CREATE POLICY "anon_insert_contact_requests"
  ON contact_requests
  FOR INSERT
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contact_requests_email     ON contact_requests (email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status    ON contact_requests (status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created   ON contact_requests (created_at DESC);
