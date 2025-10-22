/*
  # E-Procurement Platform - Initial Database Schema

  ## Overview
  This migration creates the complete database schema for an e-procurement platform
  for event and BTL procurement with supplier bidding rounds and approval workflows.

  ## Tables Created

  ### 1. users_profile
  - Extended user profile information beyond Supabase auth.users
  - Links to auth.users via user_id
  - Contains role (request_creator, procurement_approver, supplier, admin)
  - Stores user metadata like full name, phone, area/department
  
  ### 2. suppliers
  - Master catalog of suppliers/vendors
  - Contract fee percentage for each supplier
  - Contact information and active status
  - Tracks performance metrics
  
  ### 3. requests
  - Main procurement requests/solicitations
  - Created by request_creator role
  - Contains event type, description, internal budget (confidential)
  - Tracks approval status and current process stage
  - Contains configuration for rounds and deadlines
  
  ### 4. request_attachments
  - Files attached to requests (briefs, mockups, references)
  - Links to Supabase Storage
  
  ### 5. request_invitations
  - Many-to-many relationship between requests and suppliers
  - Tracks which suppliers are invited to bid
  
  ### 6. proposals
  - Supplier proposals/offers for a specific request
  - Tracks round number (1st offer, 2nd adjustment, etc.)
  - Contains total amount and status
  
  ### 7. proposal_items
  - Line items within each proposal
  - Supplier defines their own items freely based on brief
  - Contains description, quantity, unit price, total
  
  ### 8. proposal_attachments
  - Files attached to proposals (quotes, technical specs, etc.)
  
  ### 9. proposal_feedback
  - Feedback from procurement to suppliers between rounds
  - Indicates which items need adjustment
  - Contains specific comments per item
  
  ### 10. awards
  - Final adjudication/award of request to winning supplier
  - Mandatory justification if not selecting lowest price offer
  - Tracks award decision maker and timestamp
  
  ### 11. notifications
  - System notifications for all user actions
  - Real-time updates for workflow events
  - Tracks read/unread status

  ## Security
  - RLS enabled on all tables
  - Policies restrict access based on user role
  - Suppliers can only see their invited requests and own proposals
  - Internal users cannot see each other's data inappropriately
  - Budget information hidden from suppliers
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('request_creator', 'procurement_approver', 'supplier', 'admin');
CREATE TYPE request_status AS ENUM ('draft', 'pending_approval', 'approved', 'active', 'evaluation', 'awarded', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('draft', 'submitted', 'under_review', 'adjustment_requested', 'finalist', 'awarded', 'not_selected');

-- Table: users_profile
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  area text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  contract_fee_percentage numeric(5,2) NOT NULL CHECK (contract_fee_percentage >= 0 AND contract_fee_percentage <= 100),
  is_active boolean DEFAULT true,
  total_invitations integer DEFAULT 0,
  total_awards integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: requests
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number text UNIQUE NOT NULL,
  creator_id uuid REFERENCES users_profile(id) NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  internal_budget numeric(15,2),
  status request_status DEFAULT 'draft',
  max_rounds integer DEFAULT 2,
  current_round integer DEFAULT 0,
  round_deadline timestamptz,
  approved_by uuid REFERENCES users_profile(id),
  approved_at timestamptz,
  approval_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: request_attachments
CREATE TABLE IF NOT EXISTS request_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES users_profile(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: request_invitations
CREATE TABLE IF NOT EXISTS request_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  invited_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(request_id, supplier_id)
);

-- Table: proposals
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  subtotal numeric(15,2) DEFAULT 0,
  fee_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  contextual_info text,
  status proposal_status DEFAULT 'draft',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id, supplier_id, round_number)
);

-- Table: proposal_items
CREATE TABLE IF NOT EXISTS proposal_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) NOT NULL,
  needs_adjustment boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: proposal_attachments
CREATE TABLE IF NOT EXISTS proposal_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  proposal_item_id uuid REFERENCES proposal_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Table: proposal_feedback
CREATE TABLE IF NOT EXISTS proposal_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  proposal_item_id uuid REFERENCES proposal_items(id) ON DELETE CASCADE,
  feedback_text text NOT NULL,
  created_by uuid REFERENCES users_profile(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: awards
CREATE TABLE IF NOT EXISTS awards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE UNIQUE NOT NULL,
  winning_proposal_id uuid REFERENCES proposals(id) NOT NULL,
  winning_supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  awarded_amount numeric(15,2) NOT NULL,
  is_lowest_price boolean NOT NULL,
  justification text,
  awarded_by uuid REFERENCES users_profile(id) NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_profile_user_id ON users_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_role ON users_profile(role);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_creator ON requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_request_invitations_request ON request_invitations(request_id);
CREATE INDEX IF NOT EXISTS idx_request_invitations_supplier ON request_invitations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_proposals_request ON proposals(request_id);
CREATE INDEX IF NOT EXISTS idx_proposals_supplier ON proposals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Enable Row Level Security
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users_profile
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON users_profile FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for suppliers
CREATE POLICY "Internal users can view all suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for requests
CREATE POLICY "Internal users can view requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Request creators can create requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'admin')
      AND id = creator_id
    )
  );

CREATE POLICY "Request creators can update own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'admin')
      AND id = requests.creator_id
    )
  );

CREATE POLICY "Procurement approvers can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('procurement_approver', 'admin')
    )
  );

-- RLS Policies for request_attachments
CREATE POLICY "Internal users can view request attachments"
  ON request_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Suppliers can view attachments for invited requests"
  ON request_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      JOIN request_invitations ri ON ri.supplier_id = s.id
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND ri.request_id = request_attachments.request_id
    )
  );

CREATE POLICY "Request creators can manage attachments"
  ON request_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN requests r ON r.creator_id = up.id
      WHERE up.user_id = auth.uid() 
      AND r.id = request_attachments.request_id
    )
  );

-- RLS Policies for request_invitations
CREATE POLICY "Internal users can view invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Suppliers can view own invitations"
  ON request_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND s.id = request_invitations.supplier_id
    )
  );

CREATE POLICY "Procurement approvers can manage invitations"
  ON request_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('procurement_approver', 'admin')
    )
  );

-- RLS Policies for proposals
CREATE POLICY "Suppliers can view own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND s.id = proposals.supplier_id
    )
  );

CREATE POLICY "Suppliers can create own proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND s.id = supplier_id
    )
  );

CREATE POLICY "Suppliers can update own proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND s.id = proposals.supplier_id
    )
  );

CREATE POLICY "Internal users can view all proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

-- RLS Policies for proposal_items
CREATE POLICY "Suppliers can manage own proposal items"
  ON proposal_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      JOIN proposals p ON p.supplier_id = s.id
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND p.id = proposal_items.proposal_id
    )
  );

CREATE POLICY "Internal users can view all proposal items"
  ON proposal_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Procurement can update proposal items for feedback"
  ON proposal_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('procurement_approver', 'admin')
    )
  );

-- RLS Policies for proposal_attachments
CREATE POLICY "Suppliers can manage own proposal attachments"
  ON proposal_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      JOIN proposals p ON p.supplier_id = s.id
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND p.id = proposal_attachments.proposal_id
    )
  );

CREATE POLICY "Internal users can view proposal attachments"
  ON proposal_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

-- RLS Policies for proposal_feedback
CREATE POLICY "Suppliers can view feedback on own proposals"
  ON proposal_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      JOIN proposals p ON p.supplier_id = s.id
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND p.id = proposal_feedback.proposal_id
    )
  );

CREATE POLICY "Procurement can create feedback"
  ON proposal_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('procurement_approver', 'admin')
      AND id = created_by
    )
  );

CREATE POLICY "Internal users can view all feedback"
  ON proposal_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

-- RLS Policies for awards
CREATE POLICY "Internal users can view awards"
  ON awards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('request_creator', 'procurement_approver', 'admin')
    )
  );

CREATE POLICY "Procurement approvers can create awards"
  ON awards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND role IN ('procurement_approver', 'admin')
      AND id = awarded_by
    )
  );

CREATE POLICY "Suppliers can view own awards"
  ON awards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up
      JOIN suppliers s ON s.contact_email = up.email
      WHERE up.user_id = auth.uid() 
      AND up.role = 'supplier'
      AND s.id = awards.winning_supplier_id
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND id = notifications.user_id
    )
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() 
      AND id = notifications.user_id
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('request_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS request_number_seq;

CREATE TRIGGER set_request_number
  BEFORE INSERT ON requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_request_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_items_updated_at BEFORE UPDATE ON proposal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();