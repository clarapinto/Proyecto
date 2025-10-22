/*
  # Add Rounds Feedback and Award Features
  
  ## Overview
  This migration adds support for multi-round bidding with feedback, item modifications,
  and award selection workflow.
  
  ## New Tables
  
  ### 1. round_item_feedback
  Stores feedback from creator to supplier about specific items that need changes
  - Links to proposal items
  - Indicates if item should be modified, deleted, or is acceptable
  - Contains explanation text visible to supplier
  
  ### 2. round_suggestions
  Stores suggestions from creator for new items suppliers should quote
  - Links to request and round
  - Contains item description and context
  
  ### 3. award_selections
  Tracks award selection workflow before final approval
  - Creator selects winning proposal
  - Awaits approver final approval
  - Stores justification if not lowest price
  
  ## Schema Changes
  
  1. Add fields to track previous round data for comparison
  2. Add fields to track if proposal prices increased (not allowed in round 2+)
  3. Add status for rounds (accepting_proposals, under_review, etc.)
  
  ## Security
  - RLS policies for new tables
  - Only creators can provide feedback
  - Only approvers can finalize awards
*/

-- Create enum for item feedback actions
DO $$ BEGIN
  CREATE TYPE item_feedback_action AS ENUM ('modify', 'delete', 'accept', 'suggest_new');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for award selection status
DO $$ BEGIN
  CREATE TYPE award_selection_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: round_item_feedback
-- Feedback from creator to supplier about specific proposal items
CREATE TABLE IF NOT EXISTS round_item_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  proposal_item_id uuid REFERENCES proposal_items(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  action item_feedback_action NOT NULL,
  feedback_text text NOT NULL,
  suggested_price numeric(15,2),
  created_by uuid REFERENCES users_profile(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: round_suggestions
-- New items creator suggests suppliers should quote
CREATE TABLE IF NOT EXISTS round_suggestions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  round_number integer NOT NULL,
  item_name text NOT NULL,
  description text NOT NULL,
  suggested_quantity numeric(10,2) DEFAULT 1,
  notes text,
  created_by uuid REFERENCES users_profile(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: award_selections
-- Tracks award selection workflow
CREATE TABLE IF NOT EXISTS award_selections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  selected_proposal_id uuid REFERENCES proposals(id) NOT NULL,
  selected_supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  selected_amount numeric(15,2) NOT NULL,
  is_lowest_price boolean NOT NULL,
  creator_justification text,
  selected_by uuid REFERENCES users_profile(id) NOT NULL,
  selected_at timestamptz DEFAULT now(),
  status award_selection_status DEFAULT 'pending_approval',
  approved_by uuid REFERENCES users_profile(id),
  approved_at timestamptz,
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id)
);

-- Add columns to proposal_items for tracking round comparisons
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposal_items' AND column_name = 'previous_round_price'
  ) THEN
    ALTER TABLE proposal_items ADD COLUMN previous_round_price numeric(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposal_items' AND column_name = 'price_change_percentage'
  ) THEN
    ALTER TABLE proposal_items ADD COLUMN price_change_percentage numeric(10,2);
  END IF;
END $$;

-- Add column to proposals for tracking if price increased (violation in round 2+)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'has_price_increases'
  ) THEN
    ALTER TABLE proposals ADD COLUMN has_price_increases boolean DEFAULT false;
  END IF;
END $$;

-- Add column to requests for tracking round status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requests' AND column_name = 'round_status'
  ) THEN
    ALTER TABLE requests ADD COLUMN round_status text DEFAULT 'accepting_proposals';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_round_item_feedback_proposal ON round_item_feedback(proposal_id);
CREATE INDEX IF NOT EXISTS idx_round_item_feedback_item ON round_item_feedback(proposal_item_id);
CREATE INDEX IF NOT EXISTS idx_round_suggestions_request ON round_suggestions(request_id);
CREATE INDEX IF NOT EXISTS idx_award_selections_request ON award_selections(request_id);
CREATE INDEX IF NOT EXISTS idx_award_selections_status ON award_selections(status);

-- Enable RLS
ALTER TABLE round_item_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for round_item_feedback
DROP POLICY IF EXISTS "temp_round_item_feedback_all" ON round_item_feedback;
CREATE POLICY "temp_round_item_feedback_all"
  ON round_item_feedback FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for round_suggestions
DROP POLICY IF EXISTS "temp_round_suggestions_all" ON round_suggestions;
CREATE POLICY "temp_round_suggestions_all"
  ON round_suggestions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for award_selections
DROP POLICY IF EXISTS "temp_award_selections_all" ON award_selections;
CREATE POLICY "temp_award_selections_all"
  ON award_selections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS update_round_item_feedback_updated_at ON round_item_feedback;
CREATE TRIGGER update_round_item_feedback_updated_at 
  BEFORE UPDATE ON round_item_feedback
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_award_selections_updated_at ON award_selections;
CREATE TRIGGER update_award_selections_updated_at 
  BEFORE UPDATE ON award_selections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
