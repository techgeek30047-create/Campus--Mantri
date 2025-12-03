/*
  # Update Points System for Level-Based Tasks

  1. Function Updates
    - Update the award_points_for_task function to properly award points based on task level
    - Ensure correct point mapping: Level 1=10, Level 2=15, Level 3=25, Level 4=50, Level 5=100, Level 6=150

  2. Trigger Updates
    - Ensure the trigger properly calculates points when tasks are approved
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS award_points_for_task();

-- Create updated function with correct point mapping
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
    
    -- Update leaderboard
    INSERT INTO leaderboard (mantri_id, total_points, tasks_completed)
    VALUES (NEW.mantri_id, total_points, 1)
    ON CONFLICT (mantri_id)
    DO UPDATE SET
      total_points = leaderboard.total_points + total_points,
      tasks_completed = leaderboard.tasks_completed + 1,
      last_updated = now();
    
    -- Update campus_mantris total_points and approved_tasks
    UPDATE campus_mantris
    SET 
      total_points = COALESCE(total_points, 0) + total_points,
      approved_tasks = COALESCE(approved_tasks, 0) + 1
    WHERE id = NEW.mantri_id;
    
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_award_points ON task_submissions;
CREATE TRIGGER trigger_award_points
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_task();