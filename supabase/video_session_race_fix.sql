-- GlobalMatch Cycle 9 — 영상 통화 Race Condition 수정 마이그레이션
-- 문제: generate-agora-token에서 quota check와 session INSERT가 비원자적
--       → 동시 요청 2개가 모두 quota check 통과 가능 (월 한도 초과)
-- 해결: 1) 사용자당 열린 세션 1개 제한 (Partial Unique Index)
--       2) 원자적 quota claim RPC
--       3) pg_cron 기반 stale session 정리

-- ── 1) 사용자당 열린 세션 1개 제한 ─────────────────────────────────────────
-- ended_at IS NULL인 세션이 user_id당 최대 1개 허용
-- 동시 INSERT 시 두 번째 요청은 23505 unique violation → 토큰은 반환되지만 세션 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_sessions_one_open_per_user
  ON video_sessions(user_id)
  WHERE ended_at IS NULL;

-- ── 2) 원자적 quota claim RPC ────────────────────────────────────────────────
-- quota check + session INSERT를 단일 함수 안에서 직렬 실행
-- pg_advisory_xact_lock으로 같은 user_id의 동시 호출을 직렬화
CREATE OR REPLACE FUNCTION claim_video_session(
  p_user_id UUID,
  p_room_id  TEXT,
  p_partner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  session_id       UUID,
  remaining_seconds INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit_seconds  INTEGER := 0;
  v_used_seconds   INTEGER := 0;
  v_remaining      INTEGER := 0;
  v_month_start    DATE;
  v_session_id     UUID;
BEGIN
  -- user_id 기반 advisory lock으로 동시 claim 직렬화
  -- hashtext(user_id::text)를 32bit int로 변환하여 lock key로 사용
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_user_id::text), 1, 8))::bit(32)::int);

  -- 만료된 세션 정리 (동시에 한 번만 실행)
  UPDATE video_sessions
  SET
    ended_at         = started_at + INTERVAL '3600 seconds',
    duration_seconds = 3600
  WHERE ended_at    IS NULL
    AND started_at   < NOW() - INTERVAL '65 minutes'
    AND user_id      = p_user_id;

  -- 활성 구독 플랜의 월 제공 초 조회
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
    RETURN QUERY SELECT NULL::UUID, 0::INTEGER;
    RETURN;
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

  v_remaining := GREATEST(0, v_limit_seconds - v_used_seconds);

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0::INTEGER;
    RETURN;
  END IF;

  -- 세션 생성 (advisory lock 범위 내 → 직렬 실행 보장)
  INSERT INTO video_sessions (user_id, room_id, partner_id, billing_month)
  VALUES (p_user_id, p_room_id, p_partner_id, v_month_start)
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_remaining;
END;
$$;

-- ── 3) pg_cron 기반 stale session 정리 ──────────────────────────────────────
-- Supabase Dashboard → Database → Extensions 에서 pg_cron 활성화 후 아래 주석 해제:
-- SELECT cron.schedule(
--   'close-stale-video-sessions',
--   '5 * * * *',  -- 매 시간 5분에 실행
--   'SELECT close_stale_video_sessions()'
-- );
