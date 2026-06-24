-- Seed default admin user for testing
-- Run this migration in Supabase SQL Editor

-- First, ensure the admins table exists with proper schema
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  password_hash text,
  password text,
  is_super boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow public read access to admins (for login lookup)
DROP POLICY IF EXISTS "Allow public read access to admins" ON admins;
CREATE POLICY "Allow public read access to admins"
  ON admins
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert access to admins
DROP POLICY IF EXISTS "Allow public insert access to admins" ON admins;
CREATE POLICY "Allow public insert access to admins"
  ON admins
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public update access to admins
DROP POLICY IF EXISTS "Allow public update access to admins" ON admins;
CREATE POLICY "Allow public update access to admins"
  ON admins
  FOR UPDATE
  TO public
  USING (true);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Insert default admin user (bcrypt hash of 'admin123')
-- Hash: $2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi
INSERT INTO admins (username, name, email, password_hash, password, is_super)
VALUES (
  'admin',
  'Admin User',
  'admin@campusmantri.local',
  '$2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi',
  'admin123',
  true
)
ON CONFLICT (username) DO NOTHING;

-- Also create tables for admin tracking if they don't exist
CREATE TABLE IF NOT EXISTS admin_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  logged_in_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  task_submission_id uuid,
  approval_status text,
  approved_at timestamptz DEFAULT now()
);

-- Enable RLS on tracking tables
ALTER TABLE admin_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_approvals ENABLE ROW LEVEL SECURITY;

-- Allow public access to tracking tables
DROP POLICY IF EXISTS "Allow public read access to admin_logins" ON admin_logins;
CREATE POLICY "Allow public read access to admin_logins"
  ON admin_logins
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to admin_logins" ON admin_logins;
CREATE POLICY "Allow public insert access to admin_logins"
  ON admin_logins
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to admin_approvals" ON admin_approvals;
CREATE POLICY "Allow public read access to admin_approvals"
  ON admin_approvals
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to admin_approvals" ON admin_approvals;
CREATE POLICY "Allow public insert access to admin_approvals"
  ON admin_approvals
  FOR INSERT
  TO public
  WITH CHECK (true);
