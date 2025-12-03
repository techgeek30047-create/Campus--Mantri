-- Remove points system from leaderboard
-- Keep only tasks_completed tracking

-- Drop existing leaderboard index on total_points
DROP INDEX IF EXISTS idx_leaderboard_total_points;

-- Drop the column
ALTER TABLE leaderboard DROP COLUMN IF EXISTS total_points;

-- Update the secure_update_leaderboard function to only track tasks
CREATE OR REPLACE FUNCTION secure_update_leaderboard(
  p_mantri_id UUID,
  p_points_to_add INTEGER,
  p_tasks_to_add INTEGER DEFAULT 1
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update leaderboard entry (ignore points, only track tasks)
  INSERT INTO leaderboard (mantri_id, tasks_completed, last_updated)
  VALUES (p_mantri_id, p_tasks_to_add, NOW())
  ON CONFLICT (mantri_id)
  DO UPDATE SET
    tasks_completed = leaderboard.tasks_completed + p_tasks_to_add,
    last_updated = NOW();
    
  -- Update rank positions based on tasks_completed only
  WITH ranked_mantris AS (
    SELECT 
      mantri_id,
      ROW_NUMBER() OVER (ORDER BY tasks_completed DESC, last_updated ASC) as new_rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET rank_position = ranked_mantris.new_rank
  FROM ranked_mantris
  WHERE leaderboard.mantri_id = ranked_mantris.mantri_id;
END;
$$ LANGUAGE plpgsql;

-- Update task_submissions trigger to not calculate points
CREATE OR REPLACE FUNCTION award_points_for_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update leaderboard when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Just increment task count, no points calculation
    PERFORM secure_update_leaderboard(NEW.mantri_id, 0, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update approve_submission to just set status, no points
CREATE OR REPLACE FUNCTION approve_submission(submission_id UUID, points_value INTEGER DEFAULT 0)
RETURNS VOID AS $$
DECLARE
  mantri_id_val UUID;
BEGIN
  -- Get mantri_id
  SELECT ts.mantri_id 
  INTO mantri_id_val
  FROM task_submissions ts
  WHERE ts.id = submission_id;
  
  -- Update task submission - just status, no points
  UPDATE task_submissions
  SET 
    status = 'approved',
    points_awarded = 0,
    admin_feedback = COALESCE(admin_feedback, 'Task approved successfully!')
  WHERE id = submission_id;
  
  -- Update leaderboard - just increment task count
  PERFORM secure_update_leaderboard(mantri_id_val, 0, 1);
END;
$$ LANGUAGE plpgsql;
