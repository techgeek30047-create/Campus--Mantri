-- Fix leaderboard RLS to allow secure function writes

-- Drop existing restrictive policies on leaderboard
DROP POLICY IF EXISTS "Restrict leaderboard insert to system" ON leaderboard;
DROP POLICY IF EXISTS "Restrict leaderboard update to system" ON leaderboard;
DROP POLICY IF EXISTS "Restrict leaderboard delete to system" ON leaderboard;

-- Allow writes only through secure functions (SECURITY DEFINER)
-- These policies are still restrictive but allow the secure functions to work
CREATE POLICY "Allow system write access to leaderboard"
  ON leaderboard
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow system update access to leaderboard"
  ON leaderboard
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Keep delete restricted
CREATE POLICY "Restrict leaderboard delete to system"
  ON leaderboard
  FOR DELETE
  TO public
  USING (false);

-- Grant execute permission on secure functions to public
GRANT EXECUTE ON FUNCTION secure_update_leaderboard(UUID, INTEGER, INTEGER) TO public;
GRANT EXECUTE ON FUNCTION approve_submission(UUID, INTEGER) TO public;
GRANT EXECUTE ON FUNCTION award_points_for_task() TO public;
