/*
  # AI Analysis History Table
  
  ## Overview
  This migration creates a table to store AI analysis history for proposal comparisons.
  This allows users to review past AI recommendations and track decision-making patterns.
  
  ## Tables Created
  
  ### ai_analysis_history
  - Stores each AI analysis performed on proposals
  - Links to the request being analyzed
  - Contains the full AI response
  - Tracks which user requested the analysis
  - Records timestamp for historical tracking
  
  ## Security
  - RLS enabled with temporary permissive policies
  - Users can view analyses for their requests
*/

-- Create ai_analysis_history table
CREATE TABLE IF NOT EXISTS ai_analysis_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  analyzed_by uuid REFERENCES users_profile(id) NOT NULL,
  analysis_text text NOT NULL,
  proposal_count integer NOT NULL,
  lowest_amount numeric(15,2),
  highest_amount numeric(15,2),
  average_amount numeric(15,2),
  internal_budget numeric(15,2),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_request ON ai_analysis_history(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user ON ai_analysis_history(analyzed_by);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_analysis_history(created_at DESC);

-- Enable RLS
ALTER TABLE ai_analysis_history ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policy for testing
DROP POLICY IF EXISTS "temp_ai_analysis_all" ON ai_analysis_history;
CREATE POLICY "temp_ai_analysis_all"
  ON ai_analysis_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE ai_analysis_history IS 'Stores historical AI analysis results for proposal comparisons';
