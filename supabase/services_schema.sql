-- GlobalMatch: services table
-- 호스트가 제공하는 서비스(대화/레슨/투어 등) 카탈로그.
-- bookings.service_id FK가 이 테이블을 참조한다.

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  price INTEGER NOT NULL CHECK (price >= 0),          -- KRW 최소단위
  currency TEXT NOT NULL DEFAULT 'KRW'
    CHECK (currency IN ('KRW','JPY','CNY','USD')),
  category TEXT NOT NULL
    CHECK (category IN ('conversation','lesson','tour','meal','activity','other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_bookings_per_day INTEGER CHECK (max_bookings_per_day > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 인덱스 ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_services_host ON services(host_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category) WHERE is_active = true;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 호스트만 본인 서비스 CRUD
CREATE POLICY "host manages own services" ON services
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 활성 서비스는 모든 인증 사용자가 조회 가능
CREATE POLICY "authenticated users view active services" ON services
  FOR SELECT TO authenticated
  USING (is_active = true);

-- ── updated_at 자동 갱신 ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();
