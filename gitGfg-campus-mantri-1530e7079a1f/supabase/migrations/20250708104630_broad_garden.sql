/*
  # Enhanced Points System with Timely Completion Bonus

  1. Updates
    - Add timely completion bonus logic
    - Update point calculation for quality submissions
    - Add reward tier tracking

  2. Functions
    - Enhanced point awarding with time-based bonuses
    - Quality assessment bonuses
    - Automatic tier calculation

  3. Performance
    - Better leaderboard updates
    - Optimized point calculations
*/

-- Update the award_points_for_task function to include timely completion bonus
CREATE OR REPLACE FUNCTION award_points_for_task()
RETURNS TRIGGER AS $$
DECLARE
  base_points integer;
  time_bonus integer := 0;
  quality_bonus integer := 0;
  task_due_date date;
  submission_date date;
BEGIN
  -- Award points when task is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get task details
    SELECT due_date, priority INTO task_due_date, base_points
    FROM admin_tasks 
    WHERE id = NEW.admin_task_id;
    
    -- Calculate base points based on priority
    base_points := CASE 
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'urgent' THEN 50
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'high' THEN 30
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'medium' THEN 20
      ELSE 10
    END;
    
    -- Calculate timely completion bonus
    submission_date := NEW.submission_date;
    IF submission_date <= task_due_date THEN
      -- Early submission bonus
      IF submission_date < task_due_date - INTERVAL '2 days' THEN
        time_bonus := 15; -- Very early submission
      ELSIF submission_date < task_due_date THEN
        time_bonus := 10; -- Early submission
      ELSE
        time_bonus := 5; -- On-time submission
      END IF;
    END IF;
    
    -- Quality bonus (can be manually added by admin through feedback)
    IF NEW.admin_feedback IS NOT NULL AND 
       (LOWER(NEW.admin_feedback) LIKE '%excellent%' OR 
        LOWER(NEW.admin_feedback) LIKE '%outstanding%' OR 
        LOWER(NEW.admin_feedback) LIKE '%exceptional%') THEN
      quality_bonus := 10;
    END IF;
    
    -- Set total points
    NEW.points_awarded = base_points + time_bonus + quality_bonus;
    
    -- Update leaderboard
    PERFORM update_leaderboard();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get mantri tier based on points
CREATE OR REPLACE FUNCTION get_mantri_tier(points integer)
RETURNS text AS $$
BEGIN
  IF points >= 1000 THEN
    RETURN 'platinum';
  ELSIF points >= 500 THEN
    RETURN 'gold';
  ELSIF points >= 250 THEN
    RETURN 'silver';
  ELSIF points >= 100 THEN
    RETURN 'bronze';
  ELSE
    RETURN 'starter';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performers for rewards
CREATE OR REPLACE FUNCTION get_top_performers(limit_count integer DEFAULT 10)
RETURNS TABLE(
  mantri_id uuid,
  name text,
  college_name text,
  total_points integer,
  rank_position integer,
  tier text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.mantri_id,
    cm.name,
    cm.college_name,
    l.total_points,
    l.rank_position,
    get_mantri_tier(l.total_points) as tier
  FROM leaderboard l
  JOIN campus_mantris cm ON l.mantri_id = cm.id
  WHERE cm.status = 'active'
  ORDER BY l.rank_position ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update leaderboard function to include tier information
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Insert or update leaderboard entries (only count non-archived tasks)
  INSERT INTO leaderboard (mantri_id, total_points, tasks_completed, last_updated)
  SELECT 
    cm.id,
    COALESCE(SUM(ts.points_awarded), 0) as total_points,
    COUNT(CASE WHEN ts.status = 'approved' THEN 1 END) as tasks_completed,
    now()
  FROM campus_mantris cm
  LEFT JOIN task_submissions ts ON cm.id = ts.mantri_id
  LEFT JOIN admin_tasks at ON ts.admin_task_id = at.id
  WHERE (at.is_archived = false OR at.is_archived IS NULL) AND cm.status = 'active'
  GROUP BY cm.id
  ON CONFLICT (mantri_id) 
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    tasks_completed = EXCLUDED.tasks_completed,
    last_updated = EXCLUDED.last_updated;

  -- Update rank positions
  WITH ranked_mantris AS (
    SELECT 
      mantri_id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, tasks_completed DESC, last_updated ASC) as new_rank
    FROM leaderboard
    WHERE mantri_id IN (SELECT id FROM campus_mantris WHERE status = 'active')
  )
  UPDATE leaderboard 
  SET rank_position = ranked_mantris.new_rank
  FROM ranked_mantris
  WHERE leaderboard.mantri_id = ranked_mantris.mantri_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_mantri_tier(integer) TO public;
GRANT EXECUTE ON FUNCTION get_top_performers(integer) TO public;

-- Update existing leaderboard data
SELECT update_leaderboard();