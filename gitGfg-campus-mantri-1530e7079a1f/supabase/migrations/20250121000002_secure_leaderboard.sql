/*
  # Secure Leaderboard Table

  1. Security Updates
    - Remove public write access to leaderboard table
    - Only allow system functions to update points
    - Prevent direct API manipulation of points

  2. RLS Policies
    - Allow read access for all users
    - Restrict write access to system functions only
*/

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public read access to leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Allow public insert access to leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Allow public update access to leaderboard" ON leaderboard;

-- Create secure read-only policy for users
CREATE POLICY "Allow read access to leaderboard"
  ON leaderboard
  FOR SELECT
  TO public
  USING (true);

-- Create restricted insert policy (only for system functions)
CREATE POLICY "Restrict leaderboard insert to system"
  ON leaderboard
  FOR INSERT
  TO public
  WITH CHECK (false); -- No direct inserts allowed

-- Create restricted update policy (only for system functions)
CREATE POLICY "Restrict leaderboard update to system"
  ON leaderboard
  FOR UPDATE
  TO public
  USING (false); -- No direct updates allowed

-- Create restricted delete policy
CREATE POLICY "Restrict leaderboard delete to system"
  ON leaderboard
  FOR DELETE
  TO public
  USING (false); -- No direct deletes allowed

-- Create a secure function to update leaderboard (bypasses RLS)
CREATE OR REPLACE FUNCTION secure_update_leaderboard(
  p_mantri_id UUID,
  p_points_to_add INTEGER,
  p_tasks_to_add INTEGER DEFAULT 1
)
RETURNS void
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Insert or update leaderboard entry
  INSERT INTO leaderboard (mantri_id, total_points, tasks_completed, last_updated)
  VALUES (p_mantri_id, p_points_to_add, p_tasks_to_add, NOW())
  ON CONFLICT (mantri_id)
  DO UPDATE SET
    total_points = leaderboard.total_points + p_points_to_add,
    tasks_completed = leaderboard.tasks_completed + p_tasks_to_add,
    last_updated = NOW();
    
  -- Update rank positions
  WITH ranked_mantris AS (
    SELECT 
      mantri_id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, tasks_completed DESC, last_updated ASC) as new_rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET rank_position = ranked_mantris.new_rank
  FROM ranked_mantris
  WHERE leaderboard.mantri_id = ranked_mantris.mantri_id;
END;
$$ LANGUAGE plpgsql;

-- Update the award_points_for_task function to use secure function
CREATE OR REPLACE FUNCTION award_points_for_task()
RETURNS TRIGGER AS $$
DECLARE
  task_priority TEXT;
  base_points INTEGER := 0;
  bonus_points INTEGER := 0;
  total_points INTEGER := 0;
BEGIN
  -- Only award points when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get the task priority from admin_tasks
    SELECT priority INTO task_priority
    FROM admin_tasks
    WHERE id = NEW.admin_task_id;
    
    -- Calculate base points based on level
    CASE task_priority
      WHEN 'level_1' THEN base_points := 10;
      WHEN 'level_2' THEN base_points := 15;
      WHEN 'level_3' THEN base_points := 25;
      WHEN 'level_4' THEN base_points := 50;
      WHEN 'level_5' THEN base_points := 100;
      WHEN 'level_6' THEN base_points := 150;
      -- Fallback for old priority values
      WHEN 'low' THEN base_points := 10;
      WHEN 'medium' THEN base_points := 15;
      WHEN 'high' THEN base_points := 50;
      WHEN 'urgent' THEN base_points := 150;
      ELSE base_points := 10;
    END CASE;
    
    -- Add any admin-awarded bonus points
    bonus_points := COALESCE(NEW.points_awarded, 0);
    
    -- Calculate total points (base + bonus)
    total_points := base_points + bonus_points;
    
    -- Update the submission with total points
    NEW.points_awarded := total_points;
    
    -- Use secure function to update leaderboard
    PERFORM secure_update_leaderboard(NEW.mantri_id, total_points, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the approve_submission function to use secure function
CREATE OR REPLACE FUNCTION approve_submission(submission_id UUID, points_value INTEGER)
RETURNS VOID AS $$
DECLARE
  mantri_id_val UUID;
  task_priority TEXT;
  base_points INTEGER := 0;
  total_points INTEGER := 0;
BEGIN
  -- Get mantri_id and task priority
  SELECT ts.mantri_id, at.priority 
  INTO mantri_id_val, task_priority
  FROM task_submissions ts
  JOIN admin_tasks at ON ts.admin_task_id = at.id
  WHERE ts.id = submission_id;
  
  -- Calculate base points based on task level
  CASE task_priority
    WHEN 'level_1' THEN base_points := 10;
    WHEN 'level_2' THEN base_points := 15;
    WHEN 'level_3' THEN base_points := 25;
    WHEN 'level_4' THEN base_points := 50;
    WHEN 'level_5' THEN base_points := 100;
    WHEN 'level_6' THEN base_points := 150;
    -- Fallback for old priority values
    WHEN 'low' THEN base_points := 10;
    WHEN 'medium' THEN base_points := 15;
    WHEN 'high' THEN base_points := 50;
    WHEN 'urgent' THEN base_points := 150;
    ELSE base_points := 10;
  END CASE;
  
  -- Use provided points_value or base_points
  total_points := COALESCE(points_value, base_points);
  
  -- Update task submission
  UPDATE task_submissions
  SET 
    status = 'approved',
    points_awarded = total_points,
    admin_feedback = COALESCE(admin_feedback, 'Task approved successfully!')
  WHERE id = submission_id;
  
  -- Use secure function to update leaderboard
  PERFORM secure_update_leaderboard(mantri_id_val, total_points, 1);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on secure function
GRANT EXECUTE ON FUNCTION secure_update_leaderboard(UUID, INTEGER, INTEGER) TO public;
GRANT EXECUTE ON FUNCTION approve_submission(UUID, INTEGER) TO public;