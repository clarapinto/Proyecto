/*
  # Simplify RLS Policies - Use Direct JWT Check
  
  ## Problem
  The get_user_role() function with SECURITY DEFINER might be causing issues
  in the RLS context. We need a simpler, more direct approach.
  
  ## Solution
  Update RLS policies to check JWT role directly using COALESCE with database fallback.
  This avoids function call overhead and potential context issues.
  
  ## Changes
  1. Drop and recreate INSERT policy with direct JWT check
  2. Drop and recreate UPDATE policy for creators with direct JWT check
  3. Drop and recreate INSERT policy for invitations with direct JWT check
*/

-- Drop existing policies that use get_user_role()
DROP POLICY IF EXISTS "Request creators can create requests" ON requests;
DROP POLICY IF EXISTS "Request creators can update own requests" ON requests;
DROP POLICY IF EXISTS "Request creators can create invitations for own requests" ON request_invitations;

-- Recreate INSERT policy for requests with direct JWT check
CREATE POLICY "Request creators can create requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check role from JWT or fallback to database
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    AND creator_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

-- Recreate UPDATE policy for request creators with direct JWT check
CREATE POLICY "Request creators can update own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    AND creator_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    AND creator_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

-- Recreate INSERT policy for request_invitations with direct JWT check
CREATE POLICY "Request creators can create invitations for own requests"
  ON request_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    AND request_id IN (
      SELECT r.id 
      FROM requests r
      JOIN users_profile up ON up.id = r.creator_id
      WHERE up.user_id = auth.uid()
    )
  );
