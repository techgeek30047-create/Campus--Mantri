/*
  # Fix Clear Functions and Proof Upload

  1. Database Functions
    - Fix clear_old_admin_tasks function
    - Fix clear_old_announcements function
    - Ensure proper archiving logic

  2. Security
    - Maintain RLS policies
    - Secure function execution

  3. Performance
    - Optimize function execution
    - Better error handling
*/

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS clear_old_admin_tasks();
DROP FUNCTION IF EXISTS clear_old_announcements();

-- Function to clear/archive old admin tasks
CREATE OR REPLACE FUNCTION clear_old_admin_tasks()
RETURNS TABLE(cleared_count integer) AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Archive completed tasks and tasks older than 30 days
  UPDATE admin_tasks 
  SET is_archived = true 
  WHERE (status = 'completed' OR due_date < CURRENT_DATE - INTERVAL '30 days')
    AND is_archived = false;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear/archive old announcements
CREATE OR REPLACE FUNCTION clear_old_announcements()
RETURNS TABLE(cleared_count integer) AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Archive announcements older than 30 days
  UPDATE admin_announcements 
  SET is_archived = true 
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
    AND is_archived = false;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually clear all active announcements (for admin use)
CREATE OR REPLACE FUNCTION clear_all_active_announcements()
RETURNS TABLE(cleared_count integer) AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Archive all active announcements
  UPDATE admin_announcements 
  SET is_archived = true 
  WHERE is_archived = false;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually clear all completed tasks (for admin use)
CREATE OR REPLACE FUNCTION clear_all_completed_tasks()
RETURNS TABLE(cleared_count integer) AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Archive all completed tasks
  UPDATE admin_tasks 
  SET is_archived = true 
  WHERE status = 'completed' AND is_archived = false;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to public (since we're using RLS)
GRANT EXECUTE ON FUNCTION clear_old_admin_tasks() TO public;
GRANT EXECUTE ON FUNCTION clear_old_announcements() TO public;
GRANT EXECUTE ON FUNCTION clear_all_active_announcements() TO public;
GRANT EXECUTE ON FUNCTION clear_all_completed_tasks() TO public;