-- GlobalMatch 팔로우·구독 스키마 (N+56)
-- follows, creator_profiles, subscription_plans, user_subscriptions
-- RLS: 본인 데이터 관리 + 공개 데이터 조회

-- ── creator_profiles ─────────────────────────────────────────────────────────
-- 크리에이터 프로필: 팔로워 수 등 공개 집계 데이터
CREATE TABLE IF NOT EXISTS creator_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT CHECK (char_length(display_name) BETWEEN 1 AND 100),
  bio             TEXT CHECK (char_length(bio) <= 500),
  category        TEXT,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_category ON creator_profiles(category);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- 인증 사용자는 모든 크리에이터 프로필 조회 (공개 정보)
DROP POLICY IF EXISTS "authenticated read creator profiles" ON creator_profiles;
CREATE POLICY "authenticated read creator profiles" ON creator_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 본인 프로필 INSERT
DROP POLICY IF EXISTS "users manage own creator profile" ON creator_profiles;
DROP POLICY IF EXISTS "users insert own creator profile" ON creator_profiles;
CREATE POLICY "users insert own creator profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 본인 프로필 UPDATE: display_name, bio, category만 허용
-- is_verified, followers_count, following_count는 service_role만 변경 가능
DROP POLICY IF EXISTS "users update own creator profile" ON creator_profiles;
CREATE POLICY "users update own creator profile" ON creator_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_verified = (SELECT cp.is_verified FROM creator_profiles cp WHERE cp.id = auth.uid())
    AND followers_count = (SELECT cp.followers_count FROM creator_profiles cp WHERE cp.id = auth.uid())
    AND following_count = (SELECT cp.following_count FROM creator_profiles cp WHERE cp.id = auth.uid())
  );

-- followers_count / following_count는 카운터 RPC로만 변경 (클라이언트 직접 UPDATE 차단)
-- 단, SELECT+INSERT/DELETE 정책이 있으므로 UPDATE는 별도 정책 불필요 (ALL 정책 커버)

-- ── follows ───────────────────────────────────────────────────────────────────
-- 팔로우 관계: 팔로워가 본인 팔로우 관리, 타인 팔로워 목록 조회 허용
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at DESC);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 인증 사용자는 팔로우 관계 조회 (공개 소셜 그래프)
DROP POLICY IF EXISTS "authenticated read follows" ON follows;
CREATE POLICY "authenticated read follows" ON follows
  FOR SELECT USING (auth.role() = 'authenticated');

-- 팔로워 본인만 INSERT
DROP POLICY IF EXISTS "users follow others" ON follows;
CREATE POLICY "users follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- 팔로워 본인만 DELETE (언팔로우)
DROP POLICY IF EXISTS "users unfollow" ON follows;
CREATE POLICY "users unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ── subscription_plans ────────────────────────────────────────────────────────
-- 구독 플랜 카탈로그: 공개 읽기, 쓰기는 service_role만
CREATE TABLE IF NOT EXISTS subscription_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  currency     TEXT NOT NULL DEFAULT 'KRW' CHECK (char_length(currency) = 3),
  interval     TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  features     JSONB,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 활성 플랜은 누구나 조회 (가격표 공개)
DROP POLICY IF EXISTS "public read active plans" ON subscription_plans;
CREATE POLICY "public read active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 쓰기: service_role만
DROP POLICY IF EXISTS "service only write plans" ON subscription_plans;
CREATE POLICY "service only write plans" ON subscription_plans
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "service only update plans" ON subscription_plans;
CREATE POLICY "service only update plans" ON subscription_plans
  FOR UPDATE USING (false);

-- ── user_subscriptions ────────────────────────────────────────────────────────
-- 사용자 구독 현황: 본인만 조회, 쓰기는 service_role만 (결제 웹훅 처리)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due','paused')),
  start_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date        TIMESTAMPTZ,
  auto_renew      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user   ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(end_date) WHERE status = 'active';

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독만 조회
DROP POLICY IF EXISTS "users read own subscriptions" ON user_subscriptions;
CREATE POLICY "users read own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE: service_role만 (Stripe 웹훅 처리, 멱등성 보장 필수)
DROP POLICY IF EXISTS "service only write subscriptions" ON user_subscriptions;
CREATE POLICY "service only write subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "service only update subscriptions" ON user_subscriptions;
CREATE POLICY "service only update subscriptions" ON user_subscriptions
  FOR UPDATE USING (false);
