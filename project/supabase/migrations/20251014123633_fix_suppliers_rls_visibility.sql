/*
  # Fix Suppliers Visibility for Request Creators
  
  ## Problem
  Request creators cannot see suppliers even though the policy exists.
  The issue might be with how the JWT role is checked.
  
  ## Solution
  1. Add a more permissive policy that checks both JWT role and user_profile
  2. Ensure authenticated users with request_creator role can always see suppliers
  
  ## Changes
  - Drop existing restrictive policy
  - Create new policy with better role checking
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Internal users can view all suppliers" ON suppliers;

-- Create a new, more comprehensive policy
CREATE POLICY "Authenticated users with internal roles can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      -- Check JWT role
      (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
      OR
      -- Check via users_profile table
      EXISTS (
        SELECT 1 FROM users_profile up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('request_creator', 'procurement_approver', 'admin')
      )
    )
  );
