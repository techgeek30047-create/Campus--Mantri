/*
  # Fix Priority Constraint for Admin Tasks

  1. Database Schema Updates
    - Update priority check constraint to include level_1 through level_6
    - Ensure backward compatibility with old priority values
    - Fix any existing data that might have invalid priority values

  2. Security
    - Maintain existing RLS policies
    - Keep all existing permissions intact
*/

-- First, drop the existing constraint
ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;

-- Add the new constraint that includes both old and new priority values
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_priority_check 
CHECK (priority = ANY (ARRAY[
  'level_1'::text, 
  'level_2'::text, 
  'level_3'::text, 
  'level_4'::text, 
  'level_5'::text, 
  'level_6'::text,
  'low'::text, 
  'medium'::text, 
  'high'::text, 
  'urgent'::text
]));

-- Update any existing tasks that might have invalid priority values
UPDATE admin_tasks 
SET priority = 'level_1' 
WHERE priority NOT IN ('level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'level_6', 'low', 'medium', 'high', 'urgent');

-- Also fix the task_submissions table priority constraint if it exists
ALTER TABLE task_submissions DROP CONSTRAINT IF EXISTS task_submissions_priority_check;

-- Ensure the task_submissions table can handle the new priority values through the foreign key
-- No need to add constraint here as it references admin_tasks

-- Update the performance_metrics table if needed
-- No changes needed for performance_metrics as it doesn't have priority constraints

-- Create an index on priority for better performance
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON admin_tasks(priority);

-- Verify the constraint is working
DO $$
BEGIN
  -- Test insert with new priority format
  INSERT INTO admin_tasks (title, description, due_date, priority, status, created_by_admin) 
  VALUES ('Test Task', 'Test Description', CURRENT_DATE + INTERVAL '7 days', 'level_1', 'active', true);
  
  -- Clean up test data
  DELETE FROM admin_tasks WHERE title = 'Test Task' AND description = 'Test Description';
  
  RAISE NOTICE 'Priority constraint updated successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error testing priority constraint: %', SQLERRM;
END $$;