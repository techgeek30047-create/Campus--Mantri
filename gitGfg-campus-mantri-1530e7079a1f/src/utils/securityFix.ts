import { supabase } from '../lib/supabase';

export const applySecurityFix = async () => {
  try {
    
    // Execute the security migration
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        -- Drop existing permissive policies
        DROP POLICY IF EXISTS "Allow public insert access to leaderboard" ON leaderboard;
        DROP POLICY IF EXISTS "Allow public update access to leaderboard" ON leaderboard;

        -- Create restricted policies
        CREATE POLICY "Restrict leaderboard insert to system"
          ON leaderboard FOR INSERT TO public WITH CHECK (false);
        
        CREATE POLICY "Restrict leaderboard update to system"
          ON leaderboard FOR UPDATE TO public USING (false);
      `
    });

    if (error) {
      console.error('❌ Security fix failed:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Security fix error:', error);
    return false;
  }
};

// Alternative manual fix if execute_sql doesn't work
export const manualSecurityFix = () => {
  console.log('🔒 Manual Security Fix Required');
  console.log('Please run this SQL in your Supabase SQL Editor:');
  console.log(`
-- Remove dangerous policies
DROP POLICY IF EXISTS "Allow public insert access to leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Allow public update access to leaderboard" ON leaderboard;

-- Add secure policies
CREATE POLICY "Restrict leaderboard insert to system"
  ON leaderboard FOR INSERT TO public WITH CHECK (false);

CREATE POLICY "Restrict leaderboard update to system"  
  ON leaderboard FOR UPDATE TO public USING (false);
  `);
};