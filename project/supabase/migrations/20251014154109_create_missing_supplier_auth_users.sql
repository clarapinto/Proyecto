/*
  # Create Missing Supplier Auth Users
  
  ## Overview
  Create auth users for suppliers that don't have corresponding auth accounts yet.
  This ensures all suppliers in the system can log in and see their invitations.
  
  ## Users to Create
  1. juan@btlmasters.com (BTL Masters)
  2. laura@eventsolutions.com (Event Solutions)
  3. carlos@production.com (Production House)
  
  All users will have:
  - Password: supplier123
  - Role: supplier (in both JWT and profile)
  - Email confirmed
  
  ## Process
  1. Check if user already exists
  2. Create auth.users entry with encrypted password
  3. Set raw_app_meta_data with role information
  4. Create corresponding users_profile entry
*/

-- User 1: Juan Perez - BTL Masters
DO $$
DECLARE
  new_user_id uuid;
  user_email text := 'juan@btlmasters.com';
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
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
      user_email,
      crypt('supplier123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
      jsonb_build_object('full_name', 'Juan Perez'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO users_profile (user_id, role, full_name, email, phone)
    VALUES (
      new_user_id,
      'supplier'::user_role,
      'Juan Perez',
      user_email,
      '+52 55 2345 6789'
    );
    
    RAISE NOTICE 'Created user: % (BTL Masters)', user_email;
  ELSE
    RAISE NOTICE 'User already exists: %', user_email;
  END IF;
END $$;

-- User 2: Laura Martinez - Event Solutions
DO $$
DECLARE
  new_user_id uuid;
  user_email text := 'laura@eventsolutions.com';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
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
      user_email,
      crypt('supplier123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
      jsonb_build_object('full_name', 'Laura Martinez'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO users_profile (user_id, role, full_name, email, phone)
    VALUES (
      new_user_id,
      'supplier'::user_role,
      'Laura Martinez',
      user_email,
      '+52 55 5678 9012'
    );
    
    RAISE NOTICE 'Created user: % (Event Solutions)', user_email;
  ELSE
    RAISE NOTICE 'User already exists: %', user_email;
  END IF;
END $$;

-- User 3: Carlos Lopez - Production House
DO $$
DECLARE
  new_user_id uuid;
  user_email text := 'carlos@production.com';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
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
      user_email,
      crypt('supplier123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'supplier'),
      jsonb_build_object('full_name', 'Carlos Lopez'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO users_profile (user_id, role, full_name, email, phone)
    VALUES (
      new_user_id,
      'supplier'::user_role,
      'Carlos Lopez',
      user_email,
      '+52 55 4567 8901'
    );
    
    RAISE NOTICE 'Created user: % (Production House)', user_email;
  ELSE
    RAISE NOTICE 'User already exists: %', user_email;
  END IF;
END $$;

-- Verify all suppliers now have auth users
SELECT 
  s.name as supplier_name,
  s.contact_email,
  CASE 
    WHEN u.id IS NOT NULL THEN '✓ Has auth user'
    ELSE '✗ Missing auth user'
  END as status
FROM suppliers s
LEFT JOIN auth.users u ON u.email = s.contact_email
WHERE s.is_active = true
ORDER BY s.name;
