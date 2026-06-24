-- Migration: Replace level_* priorities with task_* and update constraint
-- 1) Map existing level_* values to task_* equivalents
-- 2) Replace priority check constraint to allow task_* values plus common priorities

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

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON admin_tasks(priority);
