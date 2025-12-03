/*
  # Admin Task Management System with Leaderboard

  1. New Tables
    - `admin_tasks` - Tasks created by admin for campus mantris
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `assigned_to` (uuid, foreign key to campus_mantris) - null for all mantris
      - `due_date` (date, not null)
      - `priority` (text, default 'medium')
      - `status` (text, default 'active')
      - `created_by_admin` (boolean, default true)
      - `created_at` (timestamp)

    - `task_submissions` - Campus mantri task submissions
      - `id` (uuid, primary key)
      - `admin_task_id` (uuid, foreign key to admin_tasks)
      - `mantri_id` (uuid, foreign key to campus_mantris)
      - `submission_text` (text, not null)
      - `submission_date` (date, not null)
      - `status` (text, default 'submitted')
      - `admin_feedback` (text)
      - `points_awarded` (integer, default 0)
      - `submitted_at` (timestamp)

    - `leaderboard` - Campus mantri performance tracking
      - `id` (uuid, primary key)
      - `mantri_id` (uuid, foreign key to campus_mantris)
      - `total_points` (integer, default 0)
      - `tasks_completed` (integer, default 0)
      - `rank_position` (integer)
      - `last_updated` (timestamp)

    - `admin_announcements` - Admin messages/updates
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `message` (text, not null)
      - `priority` (text, default 'normal')
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add proper policies for admin and mantri access

  3. Performance
    - Add indexes for better query performance
    - Create functions for leaderboard updates
*/

-- Admin Tasks table
CREATE TABLE IF NOT EXISTS admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES campus_mantris(id) ON DELETE CASCADE, -- null means for all mantris
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
  UNIQUE(admin_task_id, mantri_id) -- One submission per mantri per task
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mantri_id uuid UNIQUE REFERENCES campus_mantris(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  rank_position integer,
  last_updated timestamptz DEFAULT now()
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

-- Enable RLS on all new tables
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_tasks
CREATE POLICY "Allow public read access to admin_tasks"
  ON admin_tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to admin_tasks"
  ON admin_tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to admin_tasks"
  ON admin_tasks
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for task_submissions
CREATE POLICY "Allow public read access to task_submissions"
  ON task_submissions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to task_submissions"
  ON task_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to task_submissions"
  ON task_submissions
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for leaderboard
CREATE POLICY "Allow public read access to leaderboard"
  ON leaderboard
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to leaderboard"
  ON leaderboard
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to leaderboard"
  ON leaderboard
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for admin_announcements
CREATE POLICY "Allow public read access to admin_announcements"
  ON admin_announcements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to admin_announcements"
  ON admin_announcements
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to admin_announcements"
  ON admin_announcements
  FOR UPDATE
  TO public
  USING (true);

-- Create indexes for better performance
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

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Insert or update leaderboard entries
  INSERT INTO leaderboard (mantri_id, total_points, tasks_completed, last_updated)
  SELECT 
    cm.id,
    COALESCE(SUM(ts.points_awarded), 0) as total_points,
    COUNT(CASE WHEN ts.status = 'approved' THEN 1 END) as tasks_completed,
    now()
  FROM campus_mantris cm
  LEFT JOIN task_submissions ts ON cm.id = ts.mantri_id
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

-- Function to automatically award points based on task completion
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
    
    -- Update leaderboard
    PERFORM update_leaderboard();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic point awarding
CREATE TRIGGER trigger_award_points
  BEFORE UPDATE ON task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_task();

-- Initialize leaderboard for existing mantris
INSERT INTO leaderboard (mantri_id, total_points, tasks_completed)
SELECT id, 0, 0 FROM campus_mantris
ON CONFLICT (mantri_id) DO NOTHING;

-- Sample admin tasks
INSERT INTO admin_tasks (title, description, due_date, priority) VALUES
('Organize Coding Workshop', 'Conduct a 2-day coding workshop for students in your college focusing on Data Structures and Algorithms', CURRENT_DATE + INTERVAL '7 days', 'high'),
('Create Technical Blog Post', 'Write a comprehensive blog post about latest programming trends and publish it on GeeksforGeeks platform', CURRENT_DATE + INTERVAL '5 days', 'medium'),
('Campus Recruitment Drive', 'Organize a campus recruitment preparation session for final year students', CURRENT_DATE + INTERVAL '10 days', 'urgent'),
('Social Media Promotion', 'Create and share 5 posts promoting GeeksforGeeks courses and resources on social media', CURRENT_DATE + INTERVAL '3 days', 'low');

-- Sample announcements
INSERT INTO admin_announcements (title, message, priority) VALUES
('Welcome to New Task Management System', 'We have launched a new task management system. You can now view assigned tasks, submit your work, and track your performance on the leaderboard!', 'high'),
('Monthly Performance Review', 'Monthly performance reviews will be conducted based on task completion and quality of submissions. Keep up the good work!', 'normal'),
('New GeeksforGeeks Courses Available', 'Check out the latest courses available on GeeksforGeeks platform and promote them in your college.', 'normal');