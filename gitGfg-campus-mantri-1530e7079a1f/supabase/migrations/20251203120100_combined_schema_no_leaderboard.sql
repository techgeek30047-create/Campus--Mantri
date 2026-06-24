-- Combined schema (ordered) for quick setup
-- Includes core tables and admin/task submissions, excludes `leaderboard` and leaderboard functions/triggers.
-- Run this in Supabase SQL Editor (Primary DB role postgres). Ensure you have sufficient privileges.

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

-- Sample data for campus_mantris and tasks (optional) - you can remove if you don't want seed data
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
-- Note: removed `leaderboard` table, leaderboard policies, leaderboard functions and initialization.

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

-- Enable RLS on new tables
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON admin_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_date ON admin_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created_at ON admin_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_task_submissions_admin_task_id ON task_submissions(admin_task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_mantri_id ON task_submissions(mantri_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submission_date ON task_submissions(submission_date);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_is_active ON admin_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_created_at ON admin_announcements(created_at DESC);

-- Award points trigger function (keeps internal behavior but does not touch leaderboard)
CREATE OR REPLACE FUNCTION award_points_for_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points when task is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Award points based on task priority
    NEW.points_awarded = CASE 
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'urgent' THEN 50
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'high' THEN 30
      WHEN (SELECT priority FROM admin_tasks WHERE id = NEW.admin_task_id) = 'medium' THEN 20
      ELSE 10
    END;
    -- Note: leaderboard update is intentionally omitted in this combined script
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic point awarding
DROP TRIGGER IF EXISTS trigger_award_points ON task_submissions;
CREATE TRIGGER trigger_award_points
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_task();

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

-- 4) Migration to replace level_* with task_* (from 20251203120000_replace_levels_with_tasks.sql)
-- Drop old constraint if present
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;

-- Map existing level_x values to task_x
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

-- Add a new constraint that allows task_* and also common priority words
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

-- Final verification (list created tables)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campus_mantris','tasks','performance_metrics','admin_tasks','task_submissions','admin_announcements');
