/*
  # Fix Request Invitations RLS - Allow Request Creators
  
  ## Problem
  Request creators cannot insert invitations when creating a request because
  the RLS policy only allows procurement_approver and admin roles.
  
  ## Solution
  Add a new policy that allows request creators to insert invitations for their own requests.
  
  ## Changes
  1. Add policy "Request creators can create invitations for own requests"
     - Allows INSERT for request_creator role
     - Only for requests they created (validated via join with requests table)
  
  ## Security
  - Request creators can only invite suppliers to their own requests
  - Maintains separation of concerns
  - Does not allow modification or deletion, only creation
*/

-- Add policy for request creators to insert invitations for their own requests
CREATE POLICY "Request creators can create invitations for own requests"
  ON request_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text IN ('request_creator', 'admin')
    AND request_id IN (
      SELECT r.id 
      FROM requests r
      JOIN users_profile up ON up.id = r.creator_id
      WHERE up.user_id = auth.uid()
    )
  );
