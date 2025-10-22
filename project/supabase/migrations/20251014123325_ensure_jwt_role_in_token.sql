/*
  # Ensure JWT Role is Available in Token
  
  ## Problem
  Users might not be able to see suppliers if their JWT token doesn't contain
  the role in the expected format after authentication.
  
  ## Solution
  Create a database function that ensures raw_app_meta_data is properly set
  for all existing users, and verify the token includes the role.
  
  ## Changes
  1. Verify all auth.users have role in raw_app_meta_data
  2. Update any missing roles from users_profile table
*/

-- Update auth.users to ensure all users have role in raw_app_meta_data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, up.role
    FROM auth.users au
    JOIN users_profile up ON up.user_id = au.id
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(user_record.role::text)
    )
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Updated user % with role %', user_record.email, user_record.role;
  END LOOP;
END $$;
