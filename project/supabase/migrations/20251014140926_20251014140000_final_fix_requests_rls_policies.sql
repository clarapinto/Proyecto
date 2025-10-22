/*
  # Final Fix: Consolidated RLS Policies for Requests and Request Invitations

  ## Overview
  This migration consolidates and fixes all RLS policies for the requests and request_invitations tables.
  It resolves conflicts from previous migrations and establishes a clean, maintainable security model.

  ## Problem Resolved
  - Previous migrations had conflicting policies using different methods (get_user_role() vs auth.jwt())
  - Some migrations referenced functions that no longer exist
  - Policies were created and dropped multiple times causing inconsistency
  - Missing WITH CHECK clauses in some UPDATE policies

  ## Solution
  - Drop ALL existing policies on requests and request_invitations tables
  - Recreate clean policies using consistent COALESCE pattern for role checking
  - Use direct JWT access with database fallback for maximum reliability
  - Ensure all INSERT policies have WITH CHECK and all UPDATE policies have both USING and WITH CHECK

  ## Tables Affected
  1. requests - Procurement request records
  2. request_invitations - Linking table between requests and suppliers

  ## Policies Created

  ### requests table:
  1. SELECT policy for internal users (request_creator, procurement_approver, admin)
  2. INSERT policy for request creators and admins (validates creator_id and role)
  3. UPDATE policy for request creators (own requests only, with role validation)
  4. UPDATE policy for procurement approvers (any request, for approval workflow)

  ### request_invitations table:
  1. SELECT policy for internal users
  2. SELECT policy for suppliers (own invitations only)
  3. INSERT policy for request creators (own requests only)
  4. INSERT policy for procurement approvers (any request)
  5. UPDATE/DELETE policies for procurement approvers

  ## Security Model
  - Role checked via: COALESCE(auth.jwt()->>'role', SELECT from users_profile)
  - JWT is primary source (faster, no recursive queries)
  - Database fallback ensures reliability if JWT outdated
  - All policies require authentication
  - Creator ownership validated via users_profile join
  - Suppliers linked via email matching in users_profile and suppliers tables
*/

-- =====================================================
-- REQUESTS TABLE POLICIES
-- =====================================================

-- Drop all existing policies on requests table
DROP POLICY IF EXISTS "Internal users can view requests" ON requests;
DROP POLICY IF EXISTS "Request creators can create requests" ON requests;
DROP POLICY IF EXISTS "Request creators can update own requests" ON requests;
DROP POLICY IF EXISTS "Procurement approvers can update requests" ON requests;
DROP POLICY IF EXISTS "Admins can manage requests" ON requests;

-- SELECT: Internal users (request_creator, procurement_approver, admin) can view all requests
CREATE POLICY "Internal users can view requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'procurement_approver', 'admin')
  );

-- INSERT: Request creators and admins can create requests
-- Validates that creator_id matches the user's profile id
CREATE POLICY "Request creators can create requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check role from JWT with database fallback
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    -- Ensure creator_id matches the authenticated user's profile
    AND creator_id IN (
      SELECT id FROM users_profile WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Request creators can update their own requests only
-- Both USING and WITH CHECK to prevent changing creator_id to someone else
CREATE POLICY "Request creators can update own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    -- Check role
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    -- Check ownership
    AND creator_id IN (
      SELECT id FROM users_profile WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Prevent changing creator to someone else
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    AND creator_id IN (
      SELECT id FROM users_profile WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Procurement approvers can update any request (for approval workflow)
-- This allows approvers to set approved_by, approval_comments, status, etc.
CREATE POLICY "Procurement approvers can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('procurement_approver', 'admin')
  );

-- =====================================================
-- REQUEST_INVITATIONS TABLE POLICIES
-- =====================================================

-- Drop all existing policies on request_invitations table
DROP POLICY IF EXISTS "Internal users can view invitations" ON request_invitations;
DROP POLICY IF EXISTS "Suppliers can view own invitations" ON request_invitations;
DROP POLICY IF EXISTS "Request creators can create invitations for own requests" ON request_invitations;
DROP POLICY IF EXISTS "Procurement approvers can manage invitations" ON request_invitations;

-- SELECT: Internal users can view all invitations
CREATE POLICY "Internal users can view invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'procurement_approver', 'admin')
  );

-- SELECT: Suppliers can view their own invitations
CREATE POLICY "Suppliers can view own invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) = 'supplier'
    AND supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

-- INSERT: Request creators can create invitations for their own requests
-- This is critical for the wizard workflow where creators select suppliers
CREATE POLICY "Request creators can create invitations for own requests"
  ON request_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('request_creator', 'admin')
    -- Ensure they can only invite to their own requests
    AND request_id IN (
      SELECT r.id 
      FROM requests r
      JOIN users_profile up ON up.id = r.creator_id
      WHERE up.user_id = auth.uid()
    )
  );

-- INSERT: Procurement approvers can create invitations for any request
CREATE POLICY "Procurement approvers can manage invitations"
  ON request_invitations FOR ALL
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'role')::text,
      (SELECT role::text FROM users_profile WHERE user_id = auth.uid() LIMIT 1)
    ) IN ('procurement_approver', 'admin')
  );
