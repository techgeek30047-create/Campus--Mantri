-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  password VARCHAR(255),
  is_super BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DROP POLICY IF EXISTS "Allow public read access to admins" ON admins;
CREATE POLICY "Allow public read access to admins"
  ON admins
  FOR SELECT
  USING (true);

-- Create policies for public insert access
DROP POLICY IF EXISTS "Allow public insert access to admins" ON admins;
CREATE POLICY "Allow public insert access to admins"
  ON admins
  FOR INSERT
  WITH CHECK (true);

-- Create policies for public update access
DROP POLICY IF EXISTS "Allow public update access to admins" ON admins;
CREATE POLICY "Allow public update access to admins"
  ON admins
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- Insert the admin user: shivam0754 with password: Shivam@9589
-- Note: Using bcrypt hash of 'Shivam@9589': $2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi
INSERT INTO admins (username, name, email, password_hash, password, is_super)
VALUES (
  'shivam0754',
  'Shivam Admin',
  'shivam0754@campusmantri.local',
  '$2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi',
  'Shivam@9589',
  true
)
ON CONFLICT (username) DO UPDATE SET
  name = 'Shivam Admin',
  email = 'shivam0754@campusmantri.local',
  password = 'Shivam@9589',
  is_super = true,
  updated_at = NOW();
