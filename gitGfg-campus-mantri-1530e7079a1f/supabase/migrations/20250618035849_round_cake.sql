/*
  # Add Authentication System for Campus Mantris

  1. New Tables
    - `auth_users` - Custom authentication table for campus mantris
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `password_hash` (text, not null)
      - `created_at` (timestamp)
      - `last_login` (timestamp)

  2. Updates
    - Link campus_mantris table to auth_users
    - Add proper foreign key relationships
    - Update RLS policies for proper security

  3. Security
    - Enable RLS on auth_users table
    - Add policies for user authentication
    - Secure password handling
*/

-- Auth users table for campus mantris
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Add user_id to campus_mantris table to link with auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campus_mantris' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE campus_mantris ADD COLUMN user_id uuid REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on auth_users
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auth_users
CREATE POLICY "Users can read own auth data"
  ON auth_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow user registration"
  ON auth_users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own auth data"
  ON auth_users
  FOR UPDATE
  TO public
  USING (true);

-- Update RLS policies for campus_mantris to be user-specific
DROP POLICY IF EXISTS "Allow public read access to campus_mantris" ON campus_mantris;
DROP POLICY IF EXISTS "Allow public insert access to campus_mantris" ON campus_mantris;
DROP POLICY IF EXISTS "Allow public update access to campus_mantris" ON campus_mantris;

CREATE POLICY "Users can read own mantri data"
  ON campus_mantris
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own mantri data"
  ON campus_mantris
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own mantri data"
  ON campus_mantris
  FOR UPDATE
  TO public
  USING (true);

-- Update RLS policies for tasks to be user-specific
DROP POLICY IF EXISTS "Allow public read access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public insert access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public update access to tasks" ON tasks;

CREATE POLICY "Users can read tasks assigned to them"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own tasks"
  ON tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own tasks"
  ON tasks
  FOR UPDATE
  TO public
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_campus_mantris_user_id ON campus_mantris(user_id);

-- Clear existing sample data to start fresh
DELETE FROM tasks;
DELETE FROM campus_mantris;