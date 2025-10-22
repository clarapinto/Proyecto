/*
  # Fix Supplier Email Mismatches
  
  ## Problem
  Supplier users exist in auth.users with emails like:
  - ana@creativebtl.com
  - carlos@globalact.com
  - john@premiumevents.com
  - sofia@eliteevents.com
  
  But the suppliers table has different emails, causing invitations to not appear.
  
  ## Solution
  Update existing supplier records to match the auth user emails OR create new supplier
  records for users that don't have a matching supplier.
  
  ## Changes
  1. Update existing suppliers to use the correct auth user emails
  2. Ensure all supplier users have corresponding supplier records
*/

-- Update existing suppliers to match auth user emails
-- These are the suppliers that were seeded with different emails

-- Update Creative Agency email
UPDATE suppliers
SET contact_email = 'ana@creativebtl.com'
WHERE name = 'Creative Agency' AND contact_email = 'ana@creative.com';

-- Create new suppliers for auth users that don't have supplier records yet

-- Check and insert for carlos@globalact.com
INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage, is_active)
SELECT 
  'Global Act Productions',
  'Carlos Lopez',
  'carlos@globalact.com',
  '+52 55 9876 5432',
  12.00,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE contact_email = 'carlos@globalact.com'
);

-- Check and insert for john@premiumevents.com
INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage, is_active)
SELECT 
  'Premium Events Co',
  'John Smith',
  'john@premiumevents.com',
  '+52 55 8765 4321',
  11.00,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE contact_email = 'john@premiumevents.com'
);

-- Check and insert for sofia@eliteevents.com
INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage, is_active)
SELECT 
  'Elite Events Agency',
  'Sofia Martinez',
  'sofia@eliteevents.com',
  '+52 55 7654 3210',
  13.50,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE contact_email = 'sofia@eliteevents.com'
);

-- Verify the changes
-- This will show all suppliers and their matching auth users
SELECT 
  s.id,
  s.name,
  s.contact_email,
  s.contact_name,
  u.id as auth_user_id,
  up.id as profile_id
FROM suppliers s
LEFT JOIN auth.users u ON u.email = s.contact_email
LEFT JOIN users_profile up ON up.user_id = u.id
ORDER BY s.name;
