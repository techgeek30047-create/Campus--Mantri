/*
  # Campus Mantris Task Tracking Schema

  1. New Tables
    - `campus_mantris`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique, not null)
      - `phone` (text, not null)
      - `college_name` (text, not null)
      - `gfg_mantri_id` (text, unique, not null)
      - `status` (text, default 'active')
      - `joined_date` (date, default today)
      - `created_at` (timestamp)

    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `assigned_to` (uuid, foreign key to campus_mantris)
      - `status` (text, default 'pending')
      - `priority` (text, default 'medium')
      - `due_date` (date)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)

    - `performance_metrics`
      - `id` (uuid, primary key)
      - `mantri_id` (uuid, foreign key to campus_mantris)
      - `month` (date)
      - `tasks_completed` (integer, default 0)
      - `tasks_assigned` (integer, default 0)
      - `performance_score` (decimal)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

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

-- RLS Policies
CREATE POLICY "Allow public read access to campus_mantris"
  ON campus_mantris
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to campus_mantris"
  ON campus_mantris
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to campus_mantris"
  ON campus_mantris
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to tasks"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to tasks"
  ON tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to tasks"
  ON tasks
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to performance_metrics"
  ON performance_metrics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to performance_metrics"
  ON performance_metrics
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campus_mantris_email ON campus_mantris(email);
CREATE INDEX IF NOT EXISTS idx_campus_mantris_gfg_id ON campus_mantris(gfg_mantri_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_mantri_month ON performance_metrics(mantri_id, month);

-- Insert sample data
INSERT INTO campus_mantris (name, email, phone, college_name, gfg_mantri_id) VALUES
('Aarav Sharma', 'aarav.sharma@student.college.edu', '+91-9876543210', 'Delhi Technical University', 'GFG_DTU_001'),
('Priya Patel', 'priya.patel@student.vit.edu', '+91-9876543211', 'VIT University', 'GFG_VIT_002'),
('Rohit Kumar', 'rohit.kumar@student.iit.edu', '+91-9876543212', 'IIT Delhi', 'GFG_IIT_003'),
('Sneha Reddy', 'sneha.reddy@student.nit.edu', '+91-9876543213', 'NIT Warangal', 'GFG_NIT_004'),
('Arjun Singh', 'arjun.singh@student.bits.edu', '+91-9876543214', 'BITS Pilani', 'GFG_BITS_005');

-- Insert sample tasks
INSERT INTO tasks (title, description, assigned_to, status, priority, due_date) VALUES
('Organize Coding Workshop', 'Conduct a 2-day coding workshop for students', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_DTU_001'), 'completed', 'high', '2024-01-15'),
('Campus Ambassador Drive', 'Recruit new student ambassadors for GeeksforGeeks', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_VIT_002'), 'in_progress', 'medium', '2024-01-20'),
('Technical Blog Writing', 'Write 3 technical articles for GFG platform', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_IIT_003'), 'pending', 'medium', '2024-01-25'),
('Mock Interview Sessions', 'Conduct mock interviews for final year students', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_NIT_004'), 'completed', 'high', '2024-01-10'),
('Algorithm Competition', 'Organize inter-college algorithm programming contest', (SELECT id FROM campus_mantris WHERE gfg_mantri_id = 'GFG_BITS_005'), 'in_progress', 'urgent', '2024-01-30');