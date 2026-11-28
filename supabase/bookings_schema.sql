-- bookings 테이블 스키마
-- 예약 생성, 상태 관리, 슬롯 겹침 방지

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id         UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id          UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id       UUID           REFERENCES services(id) ON DELETE SET NULL,
  service_type     TEXT,
  booked_at        TIMESTAMPTZ    NOT NULL,
  timezone         TEXT           NOT NULL DEFAULT 'UTC',
  duration_minutes INTEGER        NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  amount           NUMERIC(12,2),
  currency         TEXT           DEFAULT 'KRW',
  status           TEXT           NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes            TEXT,
  idempotency_key  TEXT           UNIQUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- 호스트별 시간 조회 인덱스 (취소 제외)
CREATE INDEX IF NOT EXISTS idx_bookings_host_time
  ON bookings(host_id, booked_at)
  WHERE status NOT IN ('cancelled');

-- 동일 호스트 슬롯 겹침 방지 exclusion constraint (btree_gist 필요)
-- TOCTOU 경쟁 조건 방지: check+insert 사이의 race를 DB 레벨에서 차단
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING GIST (
    host_id WITH =,
    tstzrange(booked_at, booked_at + (duration_minutes || ' minutes')::INTERVAL, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled'));

-- 게스트별 최신 예약 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_bookings_guest_created
  ON bookings(guest_id, created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_bookings_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 본인(예약자 또는 호스트)만 조회 가능
CREATE POLICY "booking_select" ON bookings FOR SELECT
  USING (auth.uid() = guest_id OR auth.uid() = host_id);

-- 예약 생성: guest_id는 본인만
CREATE POLICY "booking_insert" ON bookings FOR INSERT
  WITH CHECK (auth.uid() = guest_id);

-- 호스트: confirmed/completed/cancelled 가능, amount 직접 변경 차단 (커미션 조작 방지)
CREATE POLICY "booking_host_update" ON bookings FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (
    status IN ('confirmed','completed','cancelled')
    AND amount = (SELECT b.amount FROM bookings b WHERE b.id = id)
  );

-- 게스트: cancelled만 가능
CREATE POLICY "booking_user_cancel" ON bookings FOR UPDATE
  USING (auth.uid() = guest_id AND auth.uid() != host_id)
  WITH CHECK (status = 'cancelled');

-- ── 슬롯 겹침 방지 함수 ────────────────────────────────────────────────────
-- 동일 호스트의 기존 예약(취소 제외)과 시간 범위가 겹치면 TRUE 반환
CREATE OR REPLACE FUNCTION check_slot_overlap(
  p_host_id  UUID,
  p_start    TIMESTAMPTZ,
  p_duration INT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bookings
    WHERE host_id = p_host_id
      AND status NOT IN ('cancelled')
      AND booked_at < p_start + (p_duration || ' minutes')::INTERVAL
      AND booked_at + (duration_minutes || ' minutes')::INTERVAL > p_start
  );
$$;
