/*
  # Create Supplier User Accounts for Remaining Providers
  
  ## Overview
  Creates user accounts with login credentials for the 4 remaining suppliers
  that were previously registered as companies only.
  
  ## Users Created
  1. John Smith (john@premiumevents.com) - Premium Events Group
  2. Ana Garcia (ana@creativebtl.com) - Creative BTL Agency
  3. Carlos Mendez (carlos@globalact.com) - Global Activations
  4. Sofia Torres (sofia@eliteevents.com) - Elite Event Management
  
  All users have password: test123456
  
  ## Process
  1. Create auth.users entries with encrypted passwords
  2. Set raw_app_meta_data with role information (for JWT)
  3. Create corresponding users_profile entries
  4. Verify the setup
*/

-- =====================================================
-- CREATE SUPPLIER USERS
-- =====================================================

-- User 1: John Smith - Premium Events Group
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
    'john@premiumevents.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
    jsonb_build_object('full_name', 'John Smith'),
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
    'John Smith',
    'john@premiumevents.com',
    NULL
  );
  
  RAISE NOTICE 'Created user: john@premiumevents.com (Supplier - Premium Events Group)';
END $$;

-- User 2: Ana Garcia - Creative BTL Agency
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
    'ana@creativebtl.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
    jsonb_build_object('full_name', 'Ana Garcia'),
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
    'Ana Garcia',
    'ana@creativebtl.com',
    NULL
  );
  
  RAISE NOTICE 'Created user: ana@creativebtl.com (Supplier - Creative BTL Agency)';
END $$;

-- User 3: Carlos Mendez - Global Activations
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
    'carlos@globalact.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
    jsonb_build_object('full_name', 'Carlos Mendez'),
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
    'Carlos Mendez',
    'carlos@globalact.com',
    NULL
  );
  
  RAISE NOTICE 'Created user: carlos@globalact.com (Supplier - Global Activations)';
END $$;

-- User 4: Sofia Torres - Elite Event Management
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
    'sofia@eliteevents.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
    jsonb_build_object('full_name', 'Sofia Torres'),
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
    'Sofia Torres',
    'sofia@eliteevents.com',
    NULL
  );
  
  RAISE NOTICE 'Created user: sofia@eliteevents.com (Supplier - Elite Event Management)';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  verification_record RECORD;
  total_suppliers INTEGER := 0;
  matched_users INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Supplier User Setup Verification ===';
  RAISE NOTICE '';
  
  FOR verification_record IN 
    SELECT 
      au.email,
      au.email_confirmed_at IS NOT NULL as email_confirmed,
      up.role as profile_role,
      up.full_name,
      au.raw_app_meta_data->>'role' as jwt_role,
      CASE 
        WHEN au.raw_app_meta_data->>'role' = up.role::text THEN 'MATCH'
        ELSE 'MISMATCH'
      END as status
    FROM auth.users au
    JOIN users_profile up ON up.user_id = au.id
    WHERE au.email IN (
      'john@premiumevents.com', 
      'ana@creativebtl.com', 
      'carlos@globalact.com', 
      'sofia@eliteevents.com'
    )
    ORDER BY au.email
  LOOP
    total_suppliers := total_suppliers + 1;
    
    RAISE NOTICE 'Email: %', verification_record.email;
    RAISE NOTICE '  Name: %', verification_record.full_name;
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
  RAISE NOTICE 'Total Supplier Users: %', total_suppliers;
  RAISE NOTICE 'Matched: %', matched_users;
  RAISE NOTICE 'Mismatched: %', (total_suppliers - matched_users);
  RAISE NOTICE '';
  
  IF matched_users = total_suppliers THEN
    RAISE NOTICE '✓ All supplier users created successfully!';
    RAISE NOTICE '✓ All users can log in with password: test123456';
  ELSE
    RAISE WARNING '! Some users have role mismatches!';
  END IF;
END $$;
