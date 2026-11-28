-- GlobalMatch 영상 통화 시간 제한 스키마 (N+60)
-- subscription_plans에 월 제공 분 추가, video_sessions 세션 추적, 잔여 시간 RPC

-- ── subscription_plans: 플랜별 영상 통화 월 제공 분 ─────────────────────────
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS video_minutes_per_month INTEGER NOT NULL DEFAULT 0;

-- ── video_sessions: 영상 통화 세션 추적 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id          TEXT        NOT NULL CHECK (char_length(room_id) BETWEEN 1 AND 128),
  partner_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,          -- ended_at - started_at (초), 종료 시 기록
  billing_month    DATE        NOT NULL DEFAULT date_trunc('month', NOW())::DATE
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_user_month
  ON video_sessions(user_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_video_sessions_stale
  ON video_sessions(started_at) WHERE ended_at IS NULL;

-- 동일 룸에 미종료 세션 중복 방지 — application-level 멱등성 체크의 DB-level 보장
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_sessions_user_room_active
  ON video_sessions(user_id, room_id) WHERE ended_at IS NULL;

ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- 본인 세션만 조회
DROP POLICY IF EXISTS "users read own video sessions" ON video_sessions;
CREATE POLICY "users read own video sessions" ON video_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 세션 생성 (server-side: service role로 INSERT)
DROP POLICY IF EXISTS "users insert own video sessions" ON video_sessions;
CREATE POLICY "users insert own video sessions" ON video_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 세션 종료 (ended_at 설정)
DROP POLICY IF EXISTS "users close own video sessions" ON video_sessions;
CREATE POLICY "users close own video sessions" ON video_sessions
  FOR UPDATE
  USING (auth.uid() = user_id AND ended_at IS NULL)
  WITH CHECK (auth.uid() = user_id AND ended_at IS NOT NULL);

-- ── RPC: 잔여 영상 통화 초(seconds) 조회 ─────────────────────────────────────
-- SECURITY DEFINER: user_subscriptions / subscription_plans를 service role로 읽음
CREATE OR REPLACE FUNCTION get_video_remaining_seconds(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit_seconds INTEGER := 0;
  v_used_seconds  INTEGER := 0;
  v_month_start   DATE;
BEGIN
  -- 활성 구독 플랜의 월 제공 분 조회
  SELECT (sp.video_minutes_per_month * 60)
  INTO v_limit_seconds
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id    = p_user_id
    AND us.status     = 'active'
    AND (us.end_date IS NULL OR us.end_date > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF v_limit_seconds IS NULL OR v_limit_seconds <= 0 THEN
    RETURN 0;
  END IF;

  v_month_start := date_trunc('month', NOW())::DATE;

  -- 이번 청구월 사용 초 합산 (진행 중인 세션 포함)
  SELECT COALESCE(SUM(
    CASE
      WHEN ended_at IS NOT NULL
        THEN duration_seconds
      ELSE EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    END
  ), 0)
  INTO v_used_seconds
  FROM video_sessions
  WHERE user_id      = p_user_id
    AND billing_month = v_month_start;

  RETURN GREATEST(0, v_limit_seconds - v_used_seconds);
END;
$$;

-- ── RPC: 원자적 quota 확인 + 세션 생성 (advisory lock으로 race condition 방지) ──
-- p_user_id 별 advisory lock을 획득해 동시 토큰 발급 직렬화.
-- 기존 미종료 세션이 있으면 재사용(멱등성), 없으면 쿼터 확인 후 신규 생성.
CREATE OR REPLACE FUNCTION claim_video_session(
  p_user_id    UUID,
  p_room_id    TEXT,
  p_partner_id UUID DEFAULT NULL
)
RETURNS TABLE(session_id UUID, remaining_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_session_id    UUID;
  v_remaining     INTEGER;
  v_billing_month DATE;
BEGIN
  -- 사용자별 advisory lock으로 동시 발급 직렬화
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  -- 만료 세션 선정리 (65분 초과)
  UPDATE video_sessions
  SET ended_at         = started_at + INTERVAL '3600 seconds',
      duration_seconds = 3600
  WHERE ended_at IS NULL
    AND started_at < NOW() - INTERVAL '65 minutes';

  v_billing_month := date_trunc('month', NOW())::DATE;

  -- 기존 미종료 세션 확인 (멱등성)
  SELECT id INTO v_session_id
  FROM video_sessions
  WHERE user_id = p_user_id
    AND room_id  = p_room_id
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    v_remaining := get_video_remaining_seconds(p_user_id);
    RETURN QUERY SELECT v_session_id, v_remaining;
    RETURN;
  END IF;

  -- 쿼터 확인
  v_remaining := get_video_remaining_seconds(p_user_id);
  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0;
    RETURN;
  END IF;

  -- 신규 세션 생성
  INSERT INTO video_sessions(user_id, room_id, partner_id, billing_month)
  VALUES (p_user_id, p_room_id, p_partner_id, v_billing_month)
  RETURNING id INTO v_session_id;

  -- 진행 중 세션 포함해 잔여 시간 재계산
  v_remaining := get_video_remaining_seconds(p_user_id);
  RETURN QUERY SELECT v_session_id, v_remaining;
END;
$$;

-- ── RPC: 만료된 세션 자동 종료 (토큰 TTL 1h + 5분 버퍼) ──────────────────────
-- Supabase Cron 또는 토큰 발급 시 호출
CREATE OR REPLACE FUNCTION close_stale_video_sessions()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE video_sessions
  SET
    ended_at         = started_at + INTERVAL '3600 seconds',
    duration_seconds = 3600
  WHERE ended_at    IS NULL
    AND started_at   < NOW() - INTERVAL '65 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
