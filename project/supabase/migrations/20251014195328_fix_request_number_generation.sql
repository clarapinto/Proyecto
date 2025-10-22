/*
  # Fix Request Number Auto-Generation

  1. Changes
    - Create sequence for request numbers
    - Create function to auto-generate unique request numbers
    - Create trigger to automatically set request_number on insert
    - Make request_number column nullable with default to allow trigger to work

  2. Technical Details
    - Sequence ensures no duplicates even with concurrent inserts
    - Format: REQ-YYYY-00001 (year-based with 5-digit padding)
    - Trigger only fires when request_number is NULL
*/

-- Create sequence for request numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS request_number_seq START WITH 1;

-- Create function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('request_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_request_number ON requests;

-- Create trigger to auto-generate request number
CREATE TRIGGER set_request_number
  BEFORE INSERT ON requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_request_number();

-- Make request_number nullable with default NULL to allow trigger to work
ALTER TABLE requests 
  ALTER COLUMN request_number DROP NOT NULL,
  ALTER COLUMN request_number SET DEFAULT NULL;