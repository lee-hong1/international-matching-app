-- GlobalMatch 분석 스키마 (N+50)
-- user_activities, user_behavior_stats 테이블 (lib/analytics.ts 사용)
-- RLS: 본인 데이터만 읽기/쓰기. 플랫폼 집계(getPlatformStatistics)는 서비스 롤 전용.

-- ── user_activities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type  TEXT NOT NULL CHECK (activity_type IN ('login','profile_view','like','match','message','purchase','review')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user    ON user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type    ON user_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_target  ON user_activities(target_user_id) WHERE target_user_id IS NOT NULL;

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 본인 활동 기록만 조회
DROP POLICY IF EXISTS "users read own activities" ON user_activities;
CREATE POLICY "users read own activities" ON user_activities
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 활동 기록만 삽입 (user_id = 본인)
DROP POLICY IF EXISTS "users insert own activities" ON user_activities;
CREATE POLICY "users insert own activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── user_behavior_stats ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_behavior_stats (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_logins         INTEGER NOT NULL DEFAULT 0,
  total_profile_views  INTEGER NOT NULL DEFAULT 0,
  total_likes_sent     INTEGER NOT NULL DEFAULT 0,
  total_matches        INTEGER NOT NULL DEFAULT 0,
  total_messages_sent  INTEGER NOT NULL DEFAULT 0,
  engagement_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  country              TEXT,
  last_active_at       TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_stats_country     ON user_behavior_stats(country);
CREATE INDEX IF NOT EXISTS idx_user_behavior_stats_engagement  ON user_behavior_stats(engagement_score DESC);

ALTER TABLE user_behavior_stats ENABLE ROW LEVEL SECURITY;

-- 본인 통계만 조회 (engagement_score 등 집계 필드는 직접 수정 불가)
DROP POLICY IF EXISTS "users manage own behavior stats" ON user_behavior_stats;
DROP POLICY IF EXISTS "users read own behavior stats" ON user_behavior_stats;
CREATE POLICY "users read own behavior stats" ON user_behavior_stats
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE: service_role만 (서버 집계, 클라이언트 engagement_score 직접 조작 차단)
DROP POLICY IF EXISTS "service only write behavior stats" ON user_behavior_stats;
CREATE POLICY "service only write behavior stats" ON user_behavior_stats
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "service only update behavior stats" ON user_behavior_stats;
CREATE POLICY "service only update behavior stats" ON user_behavior_stats
  FOR UPDATE USING (false);

-- ── 집계 함수 (관리자 대시보드용, service_role만 호출) ─────────────────────────
-- getPlatformStatistics는 집계 COUNT만 조회 (개인 식별 불가)
-- 실제 서비스에서는 Supabase Edge Function + service_role로 호출
