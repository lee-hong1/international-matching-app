-- =====================================================
-- 오프라인 이벤트 + 결제/수수료 정산 스키마
-- (술 친구 예약 / 밥 친구 예약 / 파티원 모집)
-- =====================================================

-- 제휴 매장(장소) 테이블 - 본사와 계약하여 할인 대여하는 이벤트 장소
CREATE TABLE partner_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,              -- 술집, 레스토랑, 카페, 파티룸 등
  address TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  capacity INTEGER,
  regular_price INTEGER,               -- 정상 대여가 (원)
  discount_price INTEGER,              -- 제휴 할인가 (원)
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- 매장 -> 플랫폼 수수료율(%)
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이벤트 테이블
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('drink', 'meal', 'party')),
  title TEXT NOT NULL,
  description TEXT,
  venue_type TEXT NOT NULL CHECK (venue_type IN ('partner', 'custom')),
  venue_id UUID REFERENCES partner_venues(id),
  custom_location TEXT,
  event_datetime TIMESTAMPTZ NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 4 CHECK (max_participants > 0),
  fee_per_person INTEGER NOT NULL DEFAULT 0 CHECK (fee_per_person >= 0),
  platform_fee_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00, -- 플랫폼이 호스트 수익에서 가져가는 수수료율(%)
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'cancelled')),
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (venue_type = 'partner' AND venue_id IS NOT NULL) OR
    (venue_type = 'custom' AND custom_location IS NOT NULL)
  )
);

-- 이벤트 알림 (호스트를 팔로우/맞팔한 회원에게 발송)
CREATE TABLE event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, recipient_id)
);

-- 이벤트 참가 신청 / 결제 상태
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'approved', 'rejected', 'cancelled')),
  payment_id UUID,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 기존 payments 테이블에 이벤트/수수료 정산 관련 컬럼 추가
ALTER TABLE payments ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS venue_commission_amount INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS host_payout_amount INTEGER DEFAULT 0;

ALTER TABLE event_participants
  ADD CONSTRAINT event_participants_payment_fkey
  FOREIGN KEY (payment_id) REFERENCES payments(id);

-- 수수료/정산 원장 (플랫폼 / 제휴매장 / 호스트 각 몫)
CREATE TABLE commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('platform', 'venue', 'host')),
  recipient_id UUID, -- venue_id 또는 profiles.id (platform은 NULL)
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스
-- =====================================================
CREATE INDEX idx_events_host ON events(host_id);
CREATE INDEX idx_events_status_datetime ON events(status, event_datetime);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_notifications_recipient ON event_notifications(recipient_id, is_read);
CREATE INDEX idx_commission_ledger_recipient ON commission_ledger(recipient_type, recipient_id);
CREATE INDEX idx_payments_event ON payments(event_id);

-- =====================================================
-- 참가자 수 자동 갱신 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_event_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events SET participants_count = (
    SELECT COUNT(*) FROM event_participants
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) AND status = 'approved'
  ) WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_event_participants_count
AFTER INSERT OR UPDATE OR DELETE ON event_participants
FOR EACH ROW EXECUTE FUNCTION update_event_participants_count();

-- =====================================================
-- RLS 정책
-- =====================================================
ALTER TABLE partner_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;

-- 제휴 매장: 활성화된 매장은 누구나 조회 가능
CREATE POLICY "Anyone can view active partner venues"
  ON partner_venues FOR SELECT
  USING (is_active = true);

-- 이벤트: 공개(open/closed/completed) 이벤트는 누구나 조회, 호스트는 자기 이벤트 전체 조회
CREATE POLICY "Anyone can view open events"
  ON events FOR SELECT
  USING (status IN ('open', 'closed', 'completed') OR auth.uid() = host_id);

-- 이벤트: 프리미엄 회원만 생성 가능
CREATE POLICY "Premium users can create events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_premium = true)
  );

CREATE POLICY "Hosts can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = host_id);

-- 이벤트 알림: 본인 알림만 조회/수정 가능
CREATE POLICY "Users can view own event notifications"
  ON event_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own event notifications"
  ON event_notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Hosts can insert event notifications"
  ON event_notifications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

-- 이벤트 참가: 본인 신청 조회/생성, 호스트는 자기 이벤트 참가자 조회
CREATE POLICY "Users can view own participation"
  ON event_participants FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can apply to events"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON event_participants FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

-- 수수료 원장: 본인 관련 정산만 조회 가능 (호스트 몫)
CREATE POLICY "Hosts can view own commission ledger"
  ON commission_ledger FOR SELECT
  USING (recipient_type = 'host' AND recipient_id = auth.uid());
