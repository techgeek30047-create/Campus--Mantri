-- Create a function to directly approve submissions with points
-- This bypasses the trigger completely
CREATE OR REPLACE FUNCTION approve_submission_with_points(submission_id uuid, points_value integer)
RETURNS void AS $$
DECLARE
  mantri_id_val uuid;
BEGIN
  -- Get the mantri_id from the submission
  SELECT mantri_id INTO mantri_id_val
  FROM task_submissions
  WHERE id = submission_id;
  
  -- Update the submission directly
  UPDATE task_submissions
  SET 
    status = 'approved',
    points_awarded = points_value,
    admin_feedback = 'Task approved successfully!'
  WHERE id = submission_id;
  
  -- Update the leaderboard
  INSERT INTO leaderboard (mantri_id, total_points, tasks_completed, last_updated)
  VALUES (mantri_id_val, points_value, 1, now())
  ON CONFLICT (mantri_id)
  DO UPDATE SET
    total_points = leaderboard.total_points + points_value,
    tasks_completed = leaderboard.tasks_completed + 1,
    last_updated = now();
    
  -- Update rank positions
  WITH ranked_mantris AS (
    SELECT 
      mantri_id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, last_updated ASC) as new_rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET rank_position = ranked_mantris.new_rank
  FROM ranked_mantris
  WHERE leaderboard.mantri_id = ranked_mantris.mantri_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_submission_with_points(uuid, integer) TO public;