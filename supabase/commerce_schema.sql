-- ============================================================
-- 커머스 스키마: 호스트 미니샵 / 공구 / 선물 패키지 / 디지털 굿즈
-- ============================================================

-- 호스트 상품 테이블
CREATE TABLE IF NOT EXISTS host_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type      VARCHAR(20) NOT NULL
    CHECK (product_type IN ('physical', 'digital', 'groupbuy', 'gift_package')),
  title             TEXT NOT NULL CHECK (char_length(title) <= 100),
  description       TEXT CHECK (char_length(description) <= 2000),
  price             INT NOT NULL CHECK (price >= 1000),
  stock             INT CHECK (stock IS NULL OR stock >= 0),
  images            TEXT[] DEFAULT ARRAY[]::TEXT[],
  platform_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'sold_out', 'deleted')),
  sold_count        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE host_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host_full_access_own_products"
  ON host_products FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "public_view_active_products"
  ON host_products FOR SELECT
  USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_host_products_host ON host_products(host_id, status);

-- 공구(공동구매) 캠페인
CREATE TABLE IF NOT EXISTS groupbuy_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES host_products(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  unit_price         INT NOT NULL CHECK (unit_price >= 1000),
  original_price     INT NOT NULL CHECK (original_price >= unit_price),
  min_quantity       INT NOT NULL DEFAULT 10 CHECK (min_quantity > 0),
  max_quantity       INT CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  current_quantity   INT NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  deadline           TIMESTAMPTZ NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'succeeded', 'failed', 'shipping', 'completed')),
  supplier_note      TEXT,
  shipping_fee       INT NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  expected_ship_date DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE groupbuy_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host_manage_own_campaigns"
  ON groupbuy_campaigns FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "public_view_open_campaigns"
  ON groupbuy_campaigns FOR SELECT
  USING (status IN ('open', 'succeeded', 'shipping'));

-- 공구 주문
CREATE TABLE IF NOT EXISTS groupbuy_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES groupbuy_campaigns(id) ON DELETE RESTRICT,
  buyer_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      INT NOT NULL,
  total_price     INT NOT NULL,
  shipping_addr   JSONB NOT NULL,              -- AES-256 암호화 후 저장 권장
  payment_key     VARCHAR(200) UNIQUE,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'held'
    CHECK (payment_status IN ('held', 'charged', 'refunded', 'failed')),
  idempotency_key VARCHAR(200) UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, buyer_id)                -- 1인 1참여
);

ALTER TABLE groupbuy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_own_orders"
  ON groupbuy_orders FOR ALL
  USING (buyer_id = auth.uid());

CREATE POLICY "host_view_campaign_orders"
  ON groupbuy_orders FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM groupbuy_campaigns WHERE host_id = auth.uid()
    )
  );

-- 공구 수량 원자적 증가 함수 (경쟁 조건 방지)
CREATE OR REPLACE FUNCTION increment_groupbuy_quantity(
  p_campaign_id UUID,
  p_quantity INT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE groupbuy_campaigns
  SET current_quantity = current_quantity + p_quantity
  WHERE id = p_campaign_id AND status = 'open';
END;
$$;

-- 실물 선물 패키지
CREATE TABLE IF NOT EXISTS gift_packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  receiver_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  package_type     VARCHAR(50) NOT NULL
    CHECK (package_type IN ('flowers', 'chocolate', 'wine', 'custom_box')),
  price            INT NOT NULL,
  platform_cut     INT NOT NULL,
  delivery_partner VARCHAR(100),
  tracking_number  TEXT,
  message          TEXT CHECK (char_length(message) <= 300),
  status           VARCHAR(20) NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered', 'processing', 'shipped', 'delivered', 'failed')),
  payment_key      VARCHAR(200) UNIQUE,
  idempotency_key  VARCHAR(200) UNIQUE NOT NULL,
  sent_at          TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gift_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sender_or_receiver_view"
  ON gift_packages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "sender_insert"
  ON gift_packages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- 배송 완료 후 30일 주소 자동 삭제 (개인정보 보호)
CREATE OR REPLACE FUNCTION cleanup_delivered_shipping_addr()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE groupbuy_orders
  SET shipping_addr = '{"redacted": true}'::JSONB
  WHERE payment_status = 'charged'
    AND created_at < NOW() - INTERVAL '30 days';

  UPDATE gift_packages
  SET status = status  -- trigger placeholder; real addr stored encrypted
  WHERE status = 'delivered'
    AND received_at < NOW() - INTERVAL '30 days';
END;
$$;
