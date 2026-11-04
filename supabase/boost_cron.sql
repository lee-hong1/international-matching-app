-- Boost expiry management
-- Two complementary strategies:
--   1. pg_cron (requires pg_cron extension; runs at DB level)
--   2. Supabase Edge Function trigger (fallback / alternative)

-- ─────────────────────────────────────────────────────────────────────────────
-- Strategy A: pg_cron (enable once per project)
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Run every 10 minutes: expire shop link boosts
-- SELECT cron.schedule(
--   'expire-shop-link-boosts',
--   '*/10 * * * *',
--   $$
--     UPDATE host_shop_links
--     SET is_featured = FALSE, boost_expires_at = NULL
--     WHERE is_featured = TRUE
--       AND boost_expires_at IS NOT NULL
--       AND boost_expires_at < NOW();
--   $$
-- );

-- Run every 10 minutes: expire sales event boosts
-- SELECT cron.schedule(
--   'expire-sales-event-boosts',
--   '*/10 * * * *',
--   $$
--     UPDATE sales_events
--     SET is_featured = FALSE, boost_expires_at = NULL
--     WHERE is_featured = TRUE
--       AND boost_expires_at IS NOT NULL
--       AND boost_expires_at < NOW();
--   $$
-- );

-- ─────────────────────────────────────────────────────────────────────────────
-- Strategy B: DB function + Edge Function (no pg_cron required)
-- Deploy as a Supabase Edge Function scheduled via supabase.json cron
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_boosts()
RETURNS TABLE(expired_shop_links INT, expired_sales_events INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  shop_count  INT;
  event_count INT;
BEGIN
  UPDATE host_shop_links
  SET is_featured = FALSE, boost_expires_at = NULL
  WHERE is_featured = TRUE
    AND boost_expires_at IS NOT NULL
    AND boost_expires_at < NOW();
  GET DIAGNOSTICS shop_count = ROW_COUNT;

  UPDATE sales_events
  SET is_featured = FALSE, boost_expires_at = NULL
  WHERE is_featured = TRUE
    AND boost_expires_at IS NOT NULL
    AND boost_expires_at < NOW();
  GET DIAGNOSTICS event_count = ROW_COUNT;

  RETURN QUERY SELECT shop_count, event_count;
END;
$$;

-- Grant execution to service role only (Edge Function uses service key)
REVOKE ALL ON FUNCTION expire_boosts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_boosts() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Add boost_expires_at column to sales_events if not yet present
-- (host_shop_links column already in commerce_schema.sql)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sales_events
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- Partial index: fast lookup of active boosts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_shop_links_active_boost
  ON host_shop_links (boost_expires_at)
  WHERE is_featured = TRUE AND boost_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_events_active_boost
  ON sales_events (boost_expires_at)
  WHERE is_featured = TRUE AND boost_expires_at IS NOT NULL;
