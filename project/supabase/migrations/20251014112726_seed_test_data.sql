/*
  # Add Test Data for E-Procurement Platform

  ## Test Data Includes
  
  1. Test Suppliers
    - 5 sample suppliers with different fees and contact information
  
  2. Test Users
    - Will require manual user creation via Supabase Auth Dashboard
    - This migration provides user profile templates

  ## Notes
  - Actual auth.users must be created via Supabase Auth Dashboard
  - After creating auth users, update the user_profile records with correct user_id values
  - Supplier contact emails should match real test user emails for supplier role testing
*/

-- Insert test suppliers
INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage, is_active) VALUES
  ('EventPro Solutions', 'Maria Rodriguez', 'maria@eventpro.com', '+1-555-0101', 5.5, true),
  ('Premium Events Group', 'John Smith', 'john@premiumevents.com', '+1-555-0102', 6.0, true),
  ('Creative BTL Agency', 'Ana Garcia', 'ana@creativebtl.com', '+1-555-0103', 4.5, true),
  ('Global Activations', 'Carlos Mendez', 'carlos@globalact.com', '+1-555-0104', 5.0, true),
  ('Elite Event Management', 'Sofia Torres', 'sofia@eliteevents.com', '+1-555-0105', 5.5, true)
ON CONFLICT DO NOTHING;

-- Note: To complete the setup, you need to:
-- 1. Go to Supabase Auth Dashboard
-- 2. Create test users with emails and passwords
-- 3. After creating auth users, insert their profiles:
--
-- Example SQL to run after creating auth users:
-- INSERT INTO users_profile (user_id, role, full_name, email, area)
-- VALUES
--   ('USER_UUID_HERE', 'request_creator', 'Test Creator', 'creator@test.com', 'Marketing'),
--   ('USER_UUID_HERE', 'procurement_approver', 'Test Approver', 'approver@test.com', 'Procurement'),
--   ('USER_UUID_HERE', 'supplier', 'Maria Rodriguez', 'maria@eventpro.com', NULL);
