/*
  # Complete E-Procurement Platform Schema Setup
  
  ## Overview
  This migration sets up the complete database schema with TEMPORARY permissive policies
  to ensure functionality during initial setup. These will be tightened to secure versions
  in a subsequent migration.
  
  ## Strategy
  1. Create all tables and indexes
  2. Enable RLS on all tables
  3. Create TEMPORARY permissive policies (WITH CHECK (true) for authenticated users)
  4. Add triggers for automatic field population
  5. Seed initial test data
  
  ## Security Note
  ⚠️ This migration includes PERMISSIVE policies for testing.
  These MUST be replaced with secure policies after testing is complete.
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('request_creator', 'procurement_approver', 'supplier', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('draft', 'pending_approval', 'approved', 'active', 'evaluation', 'awarded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'submitted', 'under_review', 'adjustment_requested', 'finalist', 'awarded', 'not_selected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

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

-- =====================================================
-- INDEXES
-- =====================================================

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

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

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

-- =====================================================
-- TEMPORARY PERMISSIVE POLICIES
-- ⚠️ TO BE REPLACED WITH SECURE POLICIES AFTER TESTING
-- =====================================================

-- users_profile: Temporary permissive policies
DROP POLICY IF EXISTS "temp_users_profile_all" ON users_profile;
CREATE POLICY "temp_users_profile_all"
  ON users_profile FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- suppliers: Temporary permissive policies
DROP POLICY IF EXISTS "temp_suppliers_all" ON suppliers;
CREATE POLICY "temp_suppliers_all"
  ON suppliers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- requests: Temporary permissive policies
DROP POLICY IF EXISTS "temp_requests_all" ON requests;
CREATE POLICY "temp_requests_all"
  ON requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- request_attachments: Temporary permissive policies
DROP POLICY IF EXISTS "temp_request_attachments_all" ON request_attachments;
CREATE POLICY "temp_request_attachments_all"
  ON request_attachments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- request_invitations: Temporary permissive policies
DROP POLICY IF EXISTS "temp_request_invitations_all" ON request_invitations;
CREATE POLICY "temp_request_invitations_all"
  ON request_invitations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- proposals: Temporary permissive policies
DROP POLICY IF EXISTS "temp_proposals_all" ON proposals;
CREATE POLICY "temp_proposals_all"
  ON proposals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- proposal_items: Temporary permissive policies
DROP POLICY IF EXISTS "temp_proposal_items_all" ON proposal_items;
CREATE POLICY "temp_proposal_items_all"
  ON proposal_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- proposal_attachments: Temporary permissive policies
DROP POLICY IF EXISTS "temp_proposal_attachments_all" ON proposal_attachments;
CREATE POLICY "temp_proposal_attachments_all"
  ON proposal_attachments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- proposal_feedback: Temporary permissive policies
DROP POLICY IF EXISTS "temp_proposal_feedback_all" ON proposal_feedback;
CREATE POLICY "temp_proposal_feedback_all"
  ON proposal_feedback FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- awards: Temporary permissive policies
DROP POLICY IF EXISTS "temp_awards_all" ON awards;
CREATE POLICY "temp_awards_all"
  ON awards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- notifications: Temporary permissive policies
DROP POLICY IF EXISTS "temp_notifications_all" ON notifications;
CREATE POLICY "temp_notifications_all"
  ON notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC FIELD POPULATION
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS update_users_profile_updated_at ON users_profile;
CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposal_items_updated_at ON proposal_items;
CREATE TRIGGER update_proposal_items_updated_at BEFORE UPDATE ON proposal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Test Suppliers
-- =====================================================

INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage, is_active)
VALUES
  ('Event Pro', 'Maria Rodriguez', 'maria@eventpro.com', '+52 55 1234 5678', 12.00, true),
  ('BTL Masters', 'Juan Perez', 'juan@btlmasters.com', '+52 55 2345 6789', 10.00, true),
  ('Creative Agency', 'Ana Garcia', 'ana@creative.com', '+52 55 3456 7890', 15.00, true),
  ('Production House', 'Carlos Lopez', 'carlos@production.com', '+52 55 4567 8901', 11.50, true),
  ('Event Solutions', 'Laura Martinez', 'laura@eventsolutions.com', '+52 55 5678 9012', 13.00, true)
ON CONFLICT DO NOTHING;
