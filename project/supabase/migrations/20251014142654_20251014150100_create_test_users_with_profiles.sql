/*
  # Create Test Users with Profiles and JWT Roles
  
  ## Overview
  This migration creates test users for all roles in the system and ensures their
  JWT tokens contain the correct role information.
  
  ## Users Created
  1. Request Creator (creator@test.com)
  2. Procurement Approver (approver@test.com)  
  3. Supplier User (maria@eventpro.com)
  4. Admin User (admin@test.com)
  
  All users have password: test123456
  
  ## Process
  1. Delete any existing test users
  2. Create auth.users entries with encrypted passwords
  3. Set raw_app_meta_data with role information (for JWT)
  4. Create corresponding users_profile entries
  5. Verify the setup
*/

-- Delete existing test users if they exist
DELETE FROM auth.users WHERE email IN (
  'creator@test.com',
  'approver@test.com',
  'maria@eventpro.com',
  'admin@test.com'
);

-- =====================================================
-- CREATE TEST USERS
-- =====================================================

-- User 1: Request Creator
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'creator@test.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'request_creator'),
    jsonb_build_object('full_name', 'Test Creator'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'request_creator'::user_role,
    'Test Creator',
    'creator@test.com',
    'Marketing'
  );
  
  RAISE NOTICE 'Created user: creator@test.com (Request Creator)';
END $$;

-- User 2: Procurement Approver
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'approver@test.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'procurement_approver'),
    jsonb_build_object('full_name', 'Test Approver'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'procurement_approver'::user_role,
    'Test Approver',
    'approver@test.com',
    'Compras'
  );
  
  RAISE NOTICE 'Created user: approver@test.com (Procurement Approver)';
END $$;

-- User 3: Supplier (Maria from Event Pro)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'maria@eventpro.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
    jsonb_build_object('full_name', 'Maria Rodriguez'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'supplier'::user_role,
    'Maria Rodriguez',
    'maria@eventpro.com',
    NULL
  );
  
  RAISE NOTICE 'Created user: maria@eventpro.com (Supplier)';
END $$;

-- User 4: Admin
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'admin@test.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'admin'),
    jsonb_build_object('full_name', 'System Admin'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'admin'::user_role,
    'System Admin',
    'admin@test.com',
    'IT'
  );
  
  RAISE NOTICE 'Created user: admin@test.com (Admin)';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  verification_record RECORD;
  total_users INTEGER := 0;
  matched_users INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== User Setup Verification ===';
  RAISE NOTICE '';
  
  FOR verification_record IN 
    SELECT 
      au.email,
      au.email_confirmed_at IS NOT NULL as email_confirmed,
      up.role as profile_role,
      au.raw_app_meta_data->>'role' as jwt_role,
      CASE 
        WHEN au.raw_app_meta_data->>'role' = up.role::text THEN 'MATCH'
        ELSE 'MISMATCH'
      END as status
    FROM auth.users au
    JOIN users_profile up ON up.user_id = au.id
    WHERE au.email IN ('creator@test.com', 'approver@test.com', 'maria@eventpro.com', 'admin@test.com')
    ORDER BY au.email
  LOOP
    total_users := total_users + 1;
    
    RAISE NOTICE 'Email: %', verification_record.email;
    RAISE NOTICE '  Confirmed: %', verification_record.email_confirmed;
    RAISE NOTICE '  Profile Role: %', verification_record.profile_role;
    RAISE NOTICE '  JWT Role: %', verification_record.jwt_role;
    RAISE NOTICE '  Status: %', verification_record.status;
    RAISE NOTICE '';
    
    IF verification_record.status = 'MATCH' THEN
      matched_users := matched_users + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Summary ===';
  RAISE NOTICE 'Total Users: %', total_users;
  RAISE NOTICE 'Matched: %', matched_users;
  RAISE NOTICE 'Mismatched: %', (total_users - matched_users);
  RAISE NOTICE '';
  
  IF matched_users = total_users THEN
    RAISE NOTICE 'All test users created successfully!';
    RAISE NOTICE 'All users can log in with password: test123456';
  ELSE
    RAISE WARNING 'Some users have role mismatches!';
  END IF;
END $$;
