-- Insert or update admin user: shivam0754
-- Using only existing columns: username, name, password_hash, is_super

INSERT INTO admins (username, name, password_hash, is_super)
VALUES (
  'shivam0754',
  'Shivam Admin',
  '$2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi',
  true
)
ON CONFLICT (username) DO UPDATE SET
  name = 'Shivam Admin',
  is_super = true,
  updated_at = NOW();
