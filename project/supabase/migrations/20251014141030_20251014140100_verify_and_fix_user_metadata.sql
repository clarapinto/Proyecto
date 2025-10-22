/*
  # Verify and Fix User Metadata in JWT Tokens

  ## Overview
  This migration ensures all users have their role properly set in the JWT token metadata.
  This is critical for RLS policies that rely on auth.jwt()->>'role' for authorization.

  ## Problem
  - Some users may not have 'role' field in their auth.users.raw_app_meta_data
  - This causes RLS policies to fail when checking role from JWT
  - The COALESCE fallback to database query works but is slower

  ## Solution
  - Update all existing users to ensure raw_app_meta_data contains their role
  - Verify all users have correct metadata after update

  ## Process
  1. Check all users in auth.users
  2. For each user, get their role from users_profile
  3. Update auth.users.raw_app_meta_data to include the role
  4. Verify and report results

  ## Important Notes
  - This only affects metadata stored in auth.users table
  - Does not modify users_profile table
  - Users will need to refresh their session to get updated JWT
  - The AuthContext in frontend already handles this automatically
*/

-- Execute the sync for all existing users
DO $$
DECLARE
  user_record RECORD;
  update_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting User Metadata Sync ===';
  
  -- Update all users to ensure they have role in raw_app_meta_data
  FOR user_record IN 
    SELECT au.id, au.email, up.role
    FROM auth.users au
    JOIN users_profile up ON up.user_id = au.id
  LOOP
    -- Update the user's metadata
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(user_record.role::text)
    )
    WHERE id = user_record.id;
    
    update_count := update_count + 1;
    RAISE NOTICE 'Updated user % with role %', 
      user_record.email, 
      user_record.role;
  END LOOP;

  RAISE NOTICE 'Total users updated: %', update_count;
END $$;

-- Verify the updates
DO $$
DECLARE
  verification_record RECORD;
  missing_count INTEGER := 0;
  match_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification Report ===';
  
  FOR verification_record IN 
    SELECT 
      au.email,
      up.role as profile_role,
      au.raw_app_meta_data->>'role' as jwt_role,
      CASE 
        WHEN au.raw_app_meta_data->>'role' = up.role::text THEN 'MATCH'
        ELSE 'MISMATCH'
      END as status
    FROM auth.users au
    JOIN users_profile up ON up.user_id = au.id
    ORDER BY au.email
  LOOP
    RAISE NOTICE 'User: % | Profile: % | JWT: % | Status: %',
      verification_record.email,
      verification_record.profile_role,
      COALESCE(verification_record.jwt_role, 'NULL'),
      verification_record.status;
    
    IF verification_record.status = 'MISMATCH' THEN
      missing_count := missing_count + 1;
    ELSE
      match_count := match_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Summary ===';
  RAISE NOTICE 'Matching: %', match_count;
  RAISE NOTICE 'Mismatched: %', missing_count;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Found % users with role mismatch! Manual intervention may be required.', missing_count;
  ELSE
    RAISE NOTICE 'All users have correct role metadata!';
  END IF;
END $$;
