CREATE OR REPLACE FUNCTION approve_submission(submission_id UUID, points_value INTEGER)
RETURNS VOID AS $$
DECLARE
  mantri_id_val UUID;
BEGIN
  SELECT mantri_id INTO mantri_id_val
  FROM task_submissions
  WHERE id = submission_id;
  
  UPDATE task_submissions
  SET 
    status = 'approved',
    points_awarded = points_value,
    admin_feedback = 'Task approved successfully!'
  WHERE id = submission_id;
  
  INSERT INTO leaderboard (mantri_id, total_points, tasks_completed, last_updated)
  VALUES (mantri_id_val, points_value, 1, NOW())
  ON CONFLICT (mantri_id)
  DO UPDATE SET
    total_points = leaderboard.total_points + points_value,
    tasks_completed = leaderboard.tasks_completed + 1,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION approve_submission(UUID, INTEGER) TO public;
