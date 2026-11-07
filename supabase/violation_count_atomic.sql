-- Atomic violation count increment with auto-suspend at threshold.
-- Apply when Supabase project is restored.
-- Used by /api/chat/route.ts to fix the read-modify-write race condition.

CREATE OR REPLACE FUNCTION increment_violation_count(p_user_id UUID)
RETURNS TABLE(new_count INT, is_suspended BOOLEAN)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET
    violation_count = violation_count + 1,
    is_suspended = CASE WHEN violation_count + 1 >= 3 THEN true ELSE is_suspended END
  WHERE id = p_user_id
  RETURNING violation_count, is_suspended;
$$;

GRANT EXECUTE ON FUNCTION increment_violation_count(UUID) TO service_role;
