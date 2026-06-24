import { createClient } from '@supabase/supabase-js';

const url = 'https://ksmeyiojbmlczgzuepbk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbWV5aW9qYm1sY3pnenVlcGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MzgxNTMsImV4cCI6MjA4MDMxNDE1M30.Q1ks3Kc-_Jye4o8U7Qoh3j4ytrCJXXlFtbLQP_638_U';

const supabase = createClient(url, key);

(async () => {
  try {
    console.log('Inserting default admin user...');
    // bcrypt hash of 'admin123' with salt rounds 10
    const passwordHash = '$2a$10$nOUIs5kJ7naTuTFkBy1H2OPST9/PgBkqquzi.Ee7KK/NFEzNgHyGi';
    
    const { data, error } = await supabase.from('admins').insert([{
      username: 'admin',
      name: 'Admin User',
      password_hash: passwordHash,
      is_super: true
    }]).select();
    
    if (error) {
      console.log('Error:', JSON.stringify(error, null, 2));
      process.exit(1);
    } else {
      console.log('Admin seeded successfully:', JSON.stringify(data, null, 2));
      process.exit(0);
    }
  } catch (err) {
    console.error('Exception:', err.message);
    process.exit(1);
  }
})();
