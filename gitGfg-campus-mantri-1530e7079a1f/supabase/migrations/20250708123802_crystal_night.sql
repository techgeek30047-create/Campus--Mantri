/*
  # Update Proof Types for Task Submissions

  1. Updates
    - Add new proof types for better categorization
    - Update constraints to include new proof types
    - Ensure data integrity

  2. New Proof Types
    - linkedin: LinkedIn posts/activities
    - google_docs: Google Docs/Sheets documents
    - drive_link: Google Drive or other cloud storage
    - other: Any other type of proof link
*/

-- Update the proof_type constraint to include new types
ALTER TABLE task_submissions DROP CONSTRAINT IF EXISTS task_submissions_proof_type_check;
ALTER TABLE task_submissions ADD CONSTRAINT task_submissions_proof_type_check 
  CHECK (proof_type IN ('linkedin', 'google_docs', 'drive_link', 'other'));

-- Update existing 'image' and 'document' types to 'other' for consistency
UPDATE task_submissions 
SET proof_type = 'other' 
WHERE proof_type IN ('image', 'document');

-- Add index for better performance on proof_type queries
CREATE INDEX IF NOT EXISTS idx_task_submissions_proof_type ON task_submissions(proof_type);

-- Add a function to validate proof URLs based on type
CREATE OR REPLACE FUNCTION validate_proof_url(url text, proof_type text)
RETURNS boolean AS $$
BEGIN
  -- Convert URL to lowercase for case-insensitive matching
  url := LOWER(url);
  
  CASE proof_type
    WHEN 'linkedin' THEN
      RETURN url LIKE '%linkedin.com%';
    WHEN 'google_docs' THEN
      RETURN url LIKE '%docs.google.com%' OR url LIKE '%drive.google.com%';
    WHEN 'drive_link' THEN
      RETURN url LIKE '%drive.google.com%' OR url LIKE '%dropbox.com%' OR url LIKE '%onedrive.com%';
    WHEN 'other' THEN
      -- For 'other', just check if it's a valid URL format
      RETURN url LIKE 'http%://%' OR url LIKE 'https%://%';
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_proof_url(text, text) TO public;