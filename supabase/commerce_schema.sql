-- ============================================================
-- 커머스 스키마 v2: 외부 링크 연계 모델
-- 플랫폼은 링크·홍보 제공, 실제 거래는 외부 플랫폼에서 처리
-- 플랫폼 수익 = 링크 부스팅 비용 + 이벤트 등록 수수료
-- ============================================================

-- 호스트 외부 쇼핑 링크
CREATE TABLE IF NOT EXISTS host_shop_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) <= 100),
  description       TEXT CHECK (char_length(description) <= 500),
  external_url      TEXT NOT NULL,              -- 네이버스마트스토어, 쿠팡 등 외부 URL
  external_platform VARCHAR(50) DEFAULT 'other',
  images            TEXT[] DEFAULT ARRAY[]::TEXT[],
  original_price    INT CHECK (original_price > 0),
  sale_price        INT CHECK (sale_price > 0),
  click_count       INT NOT NULL DEFAULT 0,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  boost_expires_at  TIMESTAMPTZ,               -- 부스팅 만료 시각
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'expired', 'deleted')),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE host_shop_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host_manage_own_links"
  ON host_shop_links FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "public_view_active_links"
  ON host_shop_links FOR SELECT
  USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_shop_links_host ON host_shop_links(host_id, status);
CREATE INDEX IF NOT EXISTS idx_shop_links_featured ON host_shop_links(is_featured, boost_expires_at)
  WHERE is_featured = TRUE;

-- 클릭 추적 로그 (익명화)
CREATE TABLE IF NOT EXISTS shop_link_clicks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    UUID NOT NULL REFERENCES host_shop_links(id) ON DELETE CASCADE,
  ip_hash    VARCHAR(16) NOT NULL,              -- SHA-256 앞 16자리 (개인정보 미포함)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shop_link_clicks ENABLE ROW LEVEL SECURITY;

-- 호스트만 자기 링크의 클릭 로그 조회 가능
CREATE POLICY "host_view_own_link_clicks"
  ON shop_link_clicks FOR SELECT
  USING (
    link_id IN (
      SELECT id FROM host_shop_links WHERE host_id = auth.uid()
    )
  );

-- INSERT는 서비스 롤 키(bypass RLS)로만 실행되므로 별도 정책 불필요
-- 하지만 anon/authenticated 역할에서 직접 INSERT 차단
CREATE POLICY "deny_direct_insert_clicks"
  ON shop_link_clicks FOR INSERT
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_clicks_link_time ON shop_link_clicks(link_id, created_at);

-- 클릭 수 원자적 증가
CREATE OR REPLACE FUNCTION increment_link_clicks(p_link_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE host_shop_links SET click_count = click_count + 1 WHERE id = p_link_id;
END;
$$;

-- 부스팅 만료 자동 처리 (cron 또는 edge function에서 호출)
CREATE OR REPLACE FUNCTION expire_shop_link_boosts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE host_shop_links
  SET is_featured = FALSE, boost_expires_at = NULL
  WHERE is_featured = TRUE AND boost_expires_at < NOW();
END;
$$;

-- 판매 이벤트 / 공구 공지 (외부 링크 연계)
CREATE TABLE IF NOT EXISTS sales_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type        VARCHAR(20) NOT NULL
    CHECK (event_type IN ('groupbuy', 'flash_sale', 'limited', 'presale', 'collaboration')),
  title             TEXT NOT NULL CHECK (char_length(title) <= 100),
  description       TEXT CHECK (char_length(description) <= 1000),
  external_url      TEXT NOT NULL,              -- 실제 구매는 이 외부 URL에서 처리
  external_platform VARCHAR(50) DEFAULT 'other',
  images            TEXT[] DEFAULT ARRAY[]::TEXT[],
  original_price    INT CHECK (original_price > 0),
  event_price       INT CHECK (event_price > 0),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at           TIMESTAMPTZ NOT NULL,
  min_participants  INT CHECK (min_participants > 0),  -- 공지용, 플랫폼이 집계 안 함
  status            VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'ended', 'cancelled')),
  click_count       INT NOT NULL DEFAULT 0,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  boost_expires_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE sales_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host_manage_own_events"
  ON sales_events FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "public_view_active_events"
  ON sales_events FOR SELECT
  USING (status IN ('upcoming', 'active'));

CREATE INDEX IF NOT EXISTS idx_sales_events_status ON sales_events(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_sales_events_host ON sales_events(host_id, status);

-- 판매 이벤트 클릭 수 원자적 증가
CREATE OR REPLACE FUNCTION increment_event_clicks(p_event_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE sales_events SET click_count = click_count + 1 WHERE id = p_event_id;
END;
$$;

-- 이벤트 상태 자동 업데이트 (cron 또는 edge function에서 호출)
CREATE OR REPLACE FUNCTION sync_sales_event_status()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE sales_events SET status = 'active'
  WHERE status = 'upcoming' AND starts_at <= NOW();

  UPDATE sales_events SET status = 'ended'
  WHERE status IN ('upcoming', 'active') AND ends_at < NOW();
END;
$$;

-- 링크 부스팅 결제 내역 (부스팅은 플랫폼 직접 수익)
CREATE TABLE IF NOT EXISTS link_boost_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES profiles(id),
  target_type     VARCHAR(20) NOT NULL
    CHECK (target_type IN ('shop_link', 'sales_event')),
  target_id       UUID NOT NULL,               -- host_shop_links.id 또는 sales_events.id
  boost_days      INT NOT NULL DEFAULT 7,
  amount          INT NOT NULL,                -- KRW
  payment_key     VARCHAR(200) UNIQUE,
  idempotency_key VARCHAR(200) UNIQUE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'refunded')),
  boost_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  boost_ends_at   TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE link_boost_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host_view_own_boost_payments"
  ON link_boost_payments FOR SELECT
  USING (host_id = auth.uid());
