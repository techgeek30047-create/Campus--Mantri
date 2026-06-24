/*
  # Add Proof Submission and Clear Functions

  1. Schema Updates
    - Add proof_url and proof_type to task_submissions
    - Add clear functions for admin tasks and announcements
    - Update constraints and indexes

  2. New Features
    - Proof submission (URL or file upload)
    - Clear old tasks and announcements
    - Better task management

  3. Security
    - Maintain RLS policies
    - Secure data handling
*/

-- Add proof submission columns to task_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_submissions' AND column_name = 'proof_url'
  ) THEN
    ALTER TABLE task_submissions ADD COLUMN proof_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_submissions' AND column_name = 'proof_type'
  ) THEN
    ALTER TABLE task_submissions ADD COLUMN proof_type text CHECK (proof_type IN ('linkedin', 'image', 'document', 'other'));
  END IF;
END $$;

-- Add archived status to admin_tasks for clear functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_tasks' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE admin_tasks ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- Add archived status to admin_announcements for clear functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_announcements' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE admin_announcements ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_admin_tasks_archived ON admin_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_archived ON admin_announcements(is_archived);
CREATE INDEX IF NOT EXISTS idx_task_submissions_proof_type ON task_submissions(proof_type);

-- Function to clear old tasks (archive them)
CREATE OR REPLACE FUNCTION clear_old_admin_tasks()
RETURNS void AS $$
BEGIN
  UPDATE admin_tasks 
  SET is_archived = true 
  WHERE status = 'completed' OR due_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clear old announcements (archive them)
CREATE OR REPLACE FUNCTION clear_old_announcements()
RETURNS void AS $$
BEGIN
  UPDATE admin_announcements 
  SET is_archived = true 
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Update the leaderboard function to handle archived tasks
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
  WHERE at.is_archived = false OR at.is_archived IS NULL
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
      ROW_NUMBER() OVER (ORDER BY total_points DESC, tasks_completed DESC) as new_rank
    FROM leaderboard
  )
  UPDATE leaderboard 
  SET rank_position = ranked_mantris.new_rank
  FROM ranked_mantris
  WHERE leaderboard.mantri_id = ranked_mantris.mantri_id;
END;
$$ LANGUAGE plpgsql;