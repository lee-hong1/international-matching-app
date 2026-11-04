-- GlobalMatch: host_availability table
-- 호스트의 반복 가용 시간(요일별). 예약 슬롯 충돌 체크의 기반 데이터.

CREATE TABLE IF NOT EXISTS host_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=일, 6=토
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  UNIQUE (host_id, day_of_week, start_time)
);

-- ── 인덱스 ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_host_availability_host ON host_availability(host_id)
  WHERE is_active = true;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE host_availability ENABLE ROW LEVEL SECURITY;

-- 호스트만 본인 가용 시간 관리
CREATE POLICY "host manages own availability" ON host_availability
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 인증 사용자는 활성 가용 시간 조회 가능 (예약 UI에서 사용)
CREATE POLICY "authenticated view active availability" ON host_availability
  FOR SELECT TO authenticated
  USING (is_active = true);

-- ── 타임존 유효성 함수 (application layer에서 호출) ────────────────────────────
-- PostgreSQL에서 직접 IANA timezone 검증: AT TIME ZONE 사용
CREATE OR REPLACE FUNCTION is_valid_timezone(tz TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM now() AT TIME ZONE tz;
  RETURN TRUE;
EXCEPTION WHEN invalid_parameter_value THEN
  RETURN FALSE;
END;
$$;
