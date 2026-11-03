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

CREATE POLICY "Host can update own boost"
  ON event_boosts FOR UPDATE
  USING (host_id = auth.uid());

-- Auto-expire featured flag
CREATE OR REPLACE FUNCTION expire_event_boosts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE events
  SET is_featured = FALSE, boost_expires_at = NULL
  WHERE is_featured = TRUE AND boost_expires_at < NOW();
END;
$$;
