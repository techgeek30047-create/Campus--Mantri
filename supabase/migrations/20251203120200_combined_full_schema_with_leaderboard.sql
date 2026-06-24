-- Combined full schema (ordered) for quick setup
-- Includes core tables, admin/task submissions, leaderboard, and secure leaderboard functions/policies.
-- Run this in Supabase SQL Editor (Primary DB role postgres). Ensure you have sufficient privileges.

-- 0) NOTES
-- * This file creates tables, indexes, permissive dev RLS for many tables, and a secure leaderboard with SECURITY DEFINER functions.
-- * If your Supabase plan or role disallows creating extensions, remove the extension line and replace gen_random_uuid() uses with uuid_generate_v4() if available, or provide UUIDs from the client.

-- 1) Extension needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Core tables: campus_mantris, tasks, performance_metrics
-- (from 20250617091204_twilight_sun.sql)

-- Campus Mantris table
CREATE TABLE IF NOT EXISTS campus_mantris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  college_name text NOT NULL,
  gfg_mantri_id text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES campus_mantris(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mantri_id uuid REFERENCES campus_mantris(id) ON DELETE CASCADE,
  month date NOT NULL,
  tasks_completed integer DEFAULT 0,
  tasks_assigned integer DEFAULT 0,
  performance_score decimal DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(mantri_id, month)
);

-- Enable Row Level Security
ALTER TABLE campus_mantris ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (per original file) - permissive for dev
DROP POLICY IF EXISTS "Allow public read access to campus_mantris" ON campus_mantris;
CREATE POLICY "Allow public read access to campus_mantris"
  ON campus_mantris
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to campus_mantris" ON campus_mantris;
CREATE POLICY "Allow public insert access to campus_mantris"
  ON campus_mantris
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to campus_mantris" ON campus_mantris;
CREATE POLICY "Allow public update access to campus_mantris"
  ON campus_mantris
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to tasks" ON tasks;
CREATE POLICY "Allow public read access to tasks"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to tasks" ON tasks;
CREATE POLICY "Allow public insert access to tasks"
  ON tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to tasks" ON tasks;
CREATE POLICY "Allow public update access to tasks"
  ON tasks
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to performance_metrics" ON performance_metrics;
CREATE POLICY "Allow public read access to performance_metrics"
  ON performance_metrics
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to performance_metrics" ON performance_metrics;
CREATE POLICY "Allow public insert access to performance_metrics"
  ON performance_metrics
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campus_mantris_email ON campus_mantris(email);
CREATE INDEX IF NOT EXISTS idx_campus_mantris_gfg_id ON campus_mantris(gfg_mantri_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_mantri_month ON performance_metrics(mantri_id, month);

-- Optional sample data for campus_mantris and tasks (safe upserts)
INSERT INTO campus_mantris (name, email, phone, college_name, gfg_mantri_id) VALUES
('Aarav Sharma', 'aarav.sharma@student.college.edu', '+91-9876543210', 'Delhi Technical University', 'GFG_DTU_001'),
('Priya Patel', 'priya.patel@student.vit.edu', '+91-9876543211', 'VIT University', 'GFG_VIT_002'),
('Rohit Kumar', 'rohit.kumar@student.iit.edu', '+91-9876543212', 'IIT Delhi', 'GFG_IIT_003'),
('Sneha Reddy', 'sneha.reddy@student.nit.edu', '+91-9876543213', 'NIT Warangal', 'GFG_NIT_004'),
('Arjun Singh', 'arjun.singh@student.bits.edu', '+91-9876543214', 'BITS Pilani', 'GFG_BITS_005')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tasks (title, description, assigned_to, status, priority, due_date) VALUES
('Organize Coding Workshop', 'Conduct a 2-day coding workshop for students', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_DTU_001'), 'completed', 'high', '2024-01-15'),
('Campus Ambassador Drive', 'Recruit new student ambassadors for GeeksforGeeks', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_VIT_002'), 'in_progress', 'medium', '2024-01-20'),
('Technical Blog Writing', 'Write 3 technical articles for GFG platform', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_IIT_003'), 'pending', 'medium', '2024-01-25'),
('Mock Interview Sessions', 'Conduct mock interviews for final year students', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_NIT_004'), 'completed', 'high', '2024-01-10'),
('Algorithm Competition', 'Organize inter-college algorithm programming contest', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_BITS_005'), 'in_progress', 'urgent', '2024-01-30')
ON CONFLICT DO NOTHING;

-- 3) Admin tasks & submissions & announcements (from 20250621164824_little_shrine.sql)

-- Admin Tasks table
CREATE TABLE IF NOT EXISTS admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES campus_mantris(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by_admin boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Task Submissions table
CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_task_id uuid REFERENCES admin_tasks(id) ON DELETE CASCADE,
  mantri_id uuid REFERENCES campus_mantris(id) ON DELETE CASCADE,
  submission_text text NOT NULL,
  submission_date date NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'needs_revision')),
  admin_feedback text,
  points_awarded integer DEFAULT 0,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(admin_task_id, mantri_id)
);

-- Admin Announcements table
CREATE TABLE IF NOT EXISTS admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Leaderboard table (CREATE BEFORE secure functions)
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mantri_id uuid UNIQUE REFERENCES campus_mantris(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  rank_position integer,
  last_updated timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_tasks
DROP POLICY IF EXISTS "Allow public read access to admin_tasks" ON admin_tasks;
CREATE POLICY "Allow public read access to admin_tasks"
  ON admin_tasks
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to admin_tasks" ON admin_tasks;
CREATE POLICY "Allow public insert access to admin_tasks"
  ON admin_tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to admin_tasks" ON admin_tasks;
CREATE POLICY "Allow public update access to admin_tasks"
  ON admin_tasks
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for task_submissions
DROP POLICY IF EXISTS "Allow public read access to task_submissions" ON task_submissions;
CREATE POLICY "Allow public read access to task_submissions"
  ON task_submissions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to task_submissions" ON task_submissions;
CREATE POLICY "Allow public insert access to task_submissions"
  ON task_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to task_submissions" ON task_submissions;
CREATE POLICY "Allow public update access to task_submissions"
  ON task_submissions
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for admin_announcements
DROP POLICY IF EXISTS "Allow public read access to admin_announcements" ON admin_announcements;
CREATE POLICY "Allow public read access to admin_announcements"
  ON admin_announcements
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to admin_announcements" ON admin_announcements;
CREATE POLICY "Allow public insert access to admin_announcements"
  ON admin_announcements
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to admin_announcements" ON admin_announcements;
CREATE POLICY "Allow public update access to admin_announcements"
  ON admin_announcements
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for leaderboard (secure: read allowed, writes restricted)
DROP POLICY IF EXISTS "Allow read access to leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Restrict leaderboard insert to system" ON leaderboard;
DROP POLICY IF EXISTS "Restrict leaderboard update to system" ON leaderboard;
DROP POLICY IF EXISTS "Restrict leaderboard delete to system" ON leaderboard;

CREATE POLICY "Allow read access to leaderboard"
  ON leaderboard
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Restrict leaderboard insert to system"
  ON leaderboard
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Restrict leaderboard update to system"
  ON leaderboard
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Restrict leaderboard delete to system"
  ON leaderboard
  FOR DELETE
  TO public
  USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON admin_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_date ON admin_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created_at ON admin_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_task_submissions_admin_task_id ON task_submissions(admin_task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_mantri_id ON task_submissions(mantri_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submission_date ON task_submissions(submission_date);

CREATE INDEX IF NOT EXISTS idx_leaderboard_mantri_id ON leaderboard(mantri_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_points ON leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_position ON leaderboard(rank_position);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_is_active ON admin_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_created_at ON admin_announcements(created_at DESC);

-- Sample admin tasks and announcements (optional seed)
INSERT INTO admin_tasks (title, description, due_date, priority) VALUES
('Organize Coding Workshop', 'Conduct a 2-day coding workshop for students in your college focusing on Data Structures and Algorithms', CURRENT_DATE + INTERVAL '7 days', 'high'),
('Create Technical Blog Post', 'Write a comprehensive blog post about latest programming trends and publish it on GeeksforGeeks platform', CURRENT_DATE + INTERVAL '5 days', 'medium'),
('Campus Recruitment Drive', 'Organize a campus recruitment preparation session for final year students', CURRENT_DATE + INTERVAL '10 days', 'urgent'),
('Social Media Promotion', 'Create and share 5 posts promoting GeeksforGeeks courses and resources on social media', CURRENT_DATE + INTERVAL '3 days', 'low')
ON CONFLICT DO NOTHING;

INSERT INTO admin_announcements (title, message, priority) VALUES
('Welcome to New Task Management System', 'We have launched a new task management system. You can now view assigned tasks, submit your work, and track your performance on the leaderboard!', 'high'),
('Monthly Performance Review', 'Monthly performance reviews will be conducted based on task completion and quality of submissions. Keep up the good work!', 'normal'),
('New GeeksforGeeks Courses Available', 'Check out the latest courses available on GeeksforGeeks platform and promote them in your college.', 'normal')
ON CONFLICT DO NOTHING;

-- 4) Replace level_* with task_* migration (same as 20251203120000_replace_levels_with_tasks.sql)
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;

UPDATE admin_tasks
SET priority = CASE
  WHEN priority = 'level_1' THEN 'task_1'
  WHEN priority = 'level_2' THEN 'task_2'
  WHEN priority = 'level_3' THEN 'task_3'
  WHEN priority = 'level_4' THEN 'task_4'
  WHEN priority = 'level_5' THEN 'task_5'
  WHEN priority = 'level_6' THEN 'task_6'
  ELSE priority
END
WHERE priority LIKE 'level_%';

ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_priority_check 
CHECK (priority = ANY (ARRAY[
  'task_1'::text,
  'task_2'::text,
  'task_3'::text,
  'task_4'::text,
  'task_5'::text,
  'task_6'::text,
  'low'::text,
  'medium'::text,
  'moderate'::text,
  'high'::text,
  'urgent'::text,
  'critical'::text
]));

CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON admin_tasks(priority);

-- 5) Secure leaderboard functions and award/approve functions (from 20250121000002_secure_leaderboard.sql)

-- Drop existing permissive policies (already handled above with DROP POLICY IF EXISTS), then create secure function

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

-- Secure award_points_for_task trigger function (handles both level_* and task_* and words)
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
    
    -- Calculate base points based on level/task
    CASE task_priority
      WHEN 'level_1' THEN base_points := 10;
      WHEN 'level_2' THEN base_points := 15;
      WHEN 'level_3' THEN base_points := 25;
      WHEN 'level_4' THEN base_points := 50;
      WHEN 'level_5' THEN base_points := 100;
      WHEN 'level_6' THEN base_points := 150;
      WHEN 'task_1' THEN base_points := 10;
      WHEN 'task_2' THEN base_points := 15;
      WHEN 'task_3' THEN base_points := 25;
      WHEN 'task_4' THEN base_points := 50;
      WHEN 'task_5' THEN base_points := 100;
      WHEN 'task_6' THEN base_points := 150;
      -- Fallback for word priorities
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
    WHEN 'task_1' THEN base_points := 10;
    WHEN 'task_2' THEN base_points := 15;
    WHEN 'task_3' THEN base_points := 25;
    WHEN 'task_4' THEN base_points := 50;
    WHEN 'task_5' THEN base_points := 100;
    WHEN 'task_6' THEN base_points := 150;
    -- Fallback for word priorities
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

-- Grant execute permission on secure function(s)
GRANT EXECUTE ON FUNCTION secure_update_leaderboard(UUID, INTEGER, INTEGER) TO public;
GRANT EXECUTE ON FUNCTION approve_submission(UUID, INTEGER) TO public;

-- Create trigger for automatic point awarding
DROP TRIGGER IF EXISTS trigger_award_points ON task_submissions;
CREATE TRIGGER trigger_award_points
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_task();

-- Initialize leaderboard for existing mantris (safe)
INSERT INTO leaderboard (mantri_id, total_points, tasks_completed)
SELECT id, 0, 0 FROM campus_mantris
ON CONFLICT (mantri_id) DO NOTHING;

-- Final verification (list created tables)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campus_mantris','tasks','performance_metrics','admin_tasks','task_submissions','admin_announcements','leaderboard');
