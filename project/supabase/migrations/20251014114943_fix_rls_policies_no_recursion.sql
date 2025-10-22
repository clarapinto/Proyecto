/*
  # Fix RLS Policies - Remove Infinite Recursion

  ## Problem
  Many policies were causing infinite recursion by querying users_profile 
  from within policies on users_profile or other tables.

  ## Solution
  Use auth.jwt() to access the user's role directly from JWT metadata
  instead of querying users_profile table.

  ## Changes
  1. Drop all existing problematic policies
  2. Recreate policies using auth.jwt()->>'role' for role checks
  3. Maintain same security model without recursion
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Internal users can view awards" ON awards;
DROP POLICY IF EXISTS "Procurement approvers can create awards" ON awards;
DROP POLICY IF EXISTS "Suppliers can view own awards" ON awards;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Internal users can view proposal attachments" ON proposal_attachments;
DROP POLICY IF EXISTS "Suppliers can manage own proposal attachments" ON proposal_attachments;
DROP POLICY IF EXISTS "Internal users can view all feedback" ON proposal_feedback;
DROP POLICY IF EXISTS "Procurement can create feedback" ON proposal_feedback;
DROP POLICY IF EXISTS "Suppliers can view feedback on own proposals" ON proposal_feedback;
DROP POLICY IF EXISTS "Internal users can view all proposal items" ON proposal_items;
DROP POLICY IF EXISTS "Procurement can update proposal items for feedback" ON proposal_items;
DROP POLICY IF EXISTS "Suppliers can manage own proposal items" ON proposal_items;
DROP POLICY IF EXISTS "Internal users can view all proposals" ON proposals;
DROP POLICY IF EXISTS "Suppliers can create own proposals" ON proposals;
DROP POLICY IF EXISTS "Suppliers can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Suppliers can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Internal users can view request attachments" ON request_attachments;
DROP POLICY IF EXISTS "Request creators can manage attachments" ON request_attachments;
DROP POLICY IF EXISTS "Suppliers can view attachments for invited requests" ON request_attachments;
DROP POLICY IF EXISTS "Internal users can view invitations" ON request_invitations;
DROP POLICY IF EXISTS "Procurement approvers can manage invitations" ON request_invitations;
DROP POLICY IF EXISTS "Suppliers can view own invitations" ON request_invitations;
DROP POLICY IF EXISTS "Internal users can view requests" ON requests;
DROP POLICY IF EXISTS "Procurement approvers can update requests" ON requests;
DROP POLICY IF EXISTS "Request creators can create requests" ON requests;
DROP POLICY IF EXISTS "Request creators can update own requests" ON requests;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Internal users can view all suppliers" ON suppliers;

-- Recreate policies using auth.jwt()

-- Suppliers policies
CREATE POLICY "Internal users can view all suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Requests policies
CREATE POLICY "Internal users can view requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Request creators can create requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text IN ('request_creator', 'admin')
    AND creator_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "Request creators can update own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'admin')
    AND creator_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "Procurement approvers can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('procurement_approver', 'admin')
  );

-- Request attachments policies
CREATE POLICY "Internal users can view request attachments"
  ON request_attachments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Suppliers can view attachments for invited requests"
  ON request_attachments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'supplier'
    AND request_id IN (
      SELECT ri.request_id 
      FROM request_invitations ri
      JOIN suppliers s ON s.id = ri.supplier_id
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Request creators can manage attachments"
  ON request_attachments FOR ALL
  TO authenticated
  USING (
    request_id IN (
      SELECT r.id 
      FROM requests r
      JOIN users_profile up ON up.id = r.creator_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Request invitations policies
CREATE POLICY "Internal users can view invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Suppliers can view own invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'supplier'
    AND supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Procurement approvers can manage invitations"
  ON request_invitations FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('procurement_approver', 'admin')
  );

-- Proposals policies
CREATE POLICY "Suppliers can view own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'supplier'
    AND supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can create own proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'supplier'
    AND supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can update own proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'supplier'
    AND supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Internal users can view all proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

-- Proposal items policies
CREATE POLICY "Suppliers can manage own proposal items"
  ON proposal_items FOR ALL
  TO authenticated
  USING (
    proposal_id IN (
      SELECT p.id 
      FROM proposals p
      JOIN suppliers s ON s.id = p.supplier_id
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
      AND (auth.jwt()->>'role')::text = 'supplier'
    )
  );

CREATE POLICY "Internal users can view all proposal items"
  ON proposal_items FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Procurement can update proposal items for feedback"
  ON proposal_items FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('procurement_approver', 'admin')
  );

-- Proposal attachments policies
CREATE POLICY "Suppliers can manage own proposal attachments"
  ON proposal_attachments FOR ALL
  TO authenticated
  USING (
    proposal_id IN (
      SELECT p.id 
      FROM proposals p
      JOIN suppliers s ON s.id = p.supplier_id
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
      AND (auth.jwt()->>'role')::text = 'supplier'
    )
  );

CREATE POLICY "Internal users can view proposal attachments"
  ON proposal_attachments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

-- Proposal feedback policies
CREATE POLICY "Suppliers can view feedback on own proposals"
  ON proposal_feedback FOR SELECT
  TO authenticated
  USING (
    proposal_id IN (
      SELECT p.id 
      FROM proposals p
      JOIN suppliers s ON s.id = p.supplier_id
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
      AND (auth.jwt()->>'role')::text = 'supplier'
    )
  );

CREATE POLICY "Procurement can create feedback"
  ON proposal_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text IN ('procurement_approver', 'admin')
    AND created_by IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "Internal users can view all feedback"
  ON proposal_feedback FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

-- Awards policies
CREATE POLICY "Internal users can view awards"
  ON awards FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('request_creator', 'procurement_approver', 'admin')
  );

CREATE POLICY "Procurement approvers can create awards"
  ON awards FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text IN ('procurement_approver', 'admin')
    AND awarded_by IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "Suppliers can view own awards"
  ON awards FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'supplier'
    AND winning_supplier_id IN (
      SELECT s.id 
      FROM suppliers s
      JOIN users_profile up ON up.email = s.contact_email
      WHERE up.user_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users_profile WHERE user_id = auth.uid())
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
