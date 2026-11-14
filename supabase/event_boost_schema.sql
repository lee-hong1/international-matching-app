-- Event boost / featured placement schema
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, boost_expires_at)
  WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS event_boosts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  host_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL DEFAULT 9900,
  toss_order_id    TEXT UNIQUE NOT NULL,
  toss_payment_key TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  boost_hours      INTEGER NOT NULL DEFAULT 24,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host can view own boosts"
  ON event_boosts FOR SELECT
  USING (host_id = auth.uid());

CREATE POLICY "Host can create boost"
  ON event_boosts FOR INSERT
  WITH CHECK (host_id = auth.uid());

-- 호스트는 pending 상태의 boost만 취소(cancelled) 가능.
-- status='paid' 직접 조작 차단: 결제 완료는 service_role(웹훅)에서만 설정.
-- amount/boost_hours/expires_at 도 불변 처리 (서비스 롤만 변경 가능).
CREATE POLICY "Host can update own boost"
  ON event_boosts FOR UPDATE
  USING (host_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    host_id = auth.uid()
    AND status = 'cancelled'
    AND amount = (SELECT eb.amount FROM event_boosts eb WHERE eb.id = id)
    AND boost_hours = (SELECT eb.boost_hours FROM event_boosts eb WHERE eb.id = id)
  );

-- Auto-expire featured flag
CREATE OR REPLACE FUNCTION expire_event_boosts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE events
  SET is_featured = FALSE, boost_expires_at = NULL
  WHERE is_featured = TRUE AND boost_expires_at < NOW();
END;
$$;
