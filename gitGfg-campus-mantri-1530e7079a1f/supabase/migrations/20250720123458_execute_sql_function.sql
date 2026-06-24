-- Create a function to execute raw SQL
-- This is a simple way to bypass triggers
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION execute_sql(text) TO public;