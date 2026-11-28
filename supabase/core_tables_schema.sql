-- GlobalMatch 핵심 테이블 RLS (N+53)
-- reports, matches, blocks, matching_preferences
-- 미설정 상태에서는 인증된 사용자가 타인 데이터 무제한 접근 가능

-- ── reports ──────────────────────────────────────────────────────────────────
-- 신고 테이블: 신고자만 본인 신고 조회, 쓰기/수정은 서비스 롤만
CREATE TABLE IF NOT EXISTS reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_content_id UUID,
  report_type       TEXT NOT NULL CHECK (report_type IN ('inappropriate_content','harassment','fake_profile','spam','abuse','other')),
  category          TEXT NOT NULL CHECK (category IN ('profile','message','photo','behavior')),
  description       TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  evidence          JSONB,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','investigating','resolved','rejected')),
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter    ON reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported    ON reports(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status, priority, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 신고자만 본인 신고 조회 (증거·처리 결과 포함)
DROP POLICY IF EXISTS "reporters read own reports" ON reports;
CREATE POLICY "reporters read own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- 본인이 신고자인 경우만 INSERT 가능
DROP POLICY IF EXISTS "users create own reports" ON reports;
CREATE POLICY "users create own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- UPDATE/DELETE: service_role만 (관리자 처리)
DROP POLICY IF EXISTS "service only update reports" ON reports;
CREATE POLICY "service only update reports" ON reports
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "service only delete reports" ON reports;
CREATE POLICY "service only delete reports" ON reports
  FOR DELETE USING (false);

-- ── matches ──────────────────────────────────────────────────────────────────
-- 매칭 테이블: 매칭 당사자만 조회·수정 가능
CREATE TABLE IF NOT EXISTS matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','matched','rejected','expired')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  user1_country TEXT,
  user2_country TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active, created_at DESC) WHERE is_active = true;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 매칭 당사자만 조회 (admin.ts는 service_role 클라이언트로 전환 필요)
DROP POLICY IF EXISTS "match participants read" ON matches;
CREATE POLICY "match participants read" ON matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- INSERT: 시스템(service_role)만 — 사용자가 직접 매칭 생성 불가
DROP POLICY IF EXISTS "service only insert matches" ON matches;
CREATE POLICY "service only insert matches" ON matches
  FOR INSERT WITH CHECK (false);

-- UPDATE: 당사자 허용 (매칭 수락/거절)
DROP POLICY IF EXISTS "match participants update" ON matches;
CREATE POLICY "match participants update" ON matches
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ── blocks ───────────────────────────────────────────────────────────────────
-- 차단 테이블: 차단자만 본인 차단 목록 관리
CREATE TABLE IF NOT EXISTS blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason          TEXT,
  is_mutual       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker  ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked  ON blocks(blocked_user_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- 차단자만 본인 차단 목록 조회 (차단 여부 확인도 본인만)
DROP POLICY IF EXISTS "blockers read own blocks" ON blocks;
CREATE POLICY "blockers read own blocks" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- 차단자 본인만 생성
DROP POLICY IF EXISTS "users create own blocks" ON blocks;
CREATE POLICY "users create own blocks" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- 차단자 본인만 수정 (상호 차단 상태 업데이트)
DROP POLICY IF EXISTS "blockers update own blocks" ON blocks;
CREATE POLICY "blockers update own blocks" ON blocks
  FOR UPDATE USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- 차단자 본인만 차단 해제
DROP POLICY IF EXISTS "blockers delete own blocks" ON blocks;
CREATE POLICY "blockers delete own blocks" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ── matching_preferences ─────────────────────────────────────────────────────
-- 매칭 선호도: 본인 데이터만 접근 (민감 개인정보)
CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_min         INTEGER CHECK (age_min BETWEEN 19 AND 99),
  age_max         INTEGER CHECK (age_max BETWEEN 19 AND 99),
  preferred_countries TEXT[],
  preferred_languages TEXT[],
  height_min      INTEGER,
  height_max      INTEGER,
  interests       TEXT[],
  deal_breakers   TEXT[],
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own matching prefs" ON matching_preferences;
CREATE POLICY "users manage own matching prefs" ON matching_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── user_photos ───────────────────────────────────────────────────────────────
-- 사용자 프로필 사진: 본인만 쓰기, 타인은 공개 프로필 조회만
CREATE TABLE IF NOT EXISTS user_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url  TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_idx  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_photos_user ON user_photos(user_id, order_idx);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- 본인 사진 전체 관리
DROP POLICY IF EXISTS "users manage own photos" ON user_photos;
CREATE POLICY "users manage own photos" ON user_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 인증된 사용자는 타인 프로필 사진 조회 가능 (매칭 화면 필요)
-- photo_url만 노출; 중복 검사(checkDuplicate)는 service_role로만
DROP POLICY IF EXISTS "authenticated read others photos" ON user_photos;
CREATE POLICY "authenticated read others photos" ON user_photos
  FOR SELECT USING (auth.role() = 'authenticated');
