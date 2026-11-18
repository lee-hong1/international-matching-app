-- Replaces O(N) JS aggregation in /api/analytics/countries
-- Apply when Supabase project is restored.

CREATE OR REPLACE FUNCTION analytics_countries(p_since TIMESTAMPTZ)
RETURNS TABLE(
  country     TEXT,
  user_count  BIGINT,
  active_users BIGINT,
  premium_users BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    country,
    COUNT(*)                                              AS user_count,
    COUNT(*) FILTER (WHERE last_active_at >= p_since)    AS active_users,
    COUNT(*) FILTER (WHERE is_premium = true)            AS premium_users
  FROM profiles
  WHERE country IS NOT NULL
  GROUP BY country
  ORDER BY user_count DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION analytics_countries(TIMESTAMPTZ) TO service_role;
