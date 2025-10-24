-- Create complete_audits table
-- This table stores the audit results for each lead

CREATE TABLE IF NOT EXISTS complete_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Reference to lead
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- SEO Scores
  seo_local_score INTEGER NOT NULL DEFAULT 0,
  seo_onsite_score INTEGER NOT NULL DEFAULT 0,

  -- Citation Coverage (percentage 0-100)
  citation_coverage INTEGER NOT NULL DEFAULT 0,

  -- Keyword Opportunities
  keyword_count INTEGER NOT NULL DEFAULT 0,

  -- Email tracking
  report_sent BOOLEAN NOT NULL DEFAULT false,
  report_sent_at TIMESTAMPTZ,
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMPTZ,

  -- Raw audit data (optional: store full API responses for debugging)
  raw_seo_data JSONB,
  raw_citation_data JSONB,
  raw_keyword_data JSONB
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_complete_audits_lead_id ON complete_audits(lead_id);
CREATE INDEX IF NOT EXISTS idx_complete_audits_created_at ON complete_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complete_audits_report_sent ON complete_audits(report_sent);

-- Create index on scores for analytics
CREATE INDEX IF NOT EXISTS idx_complete_audits_scores ON complete_audits(seo_local_score, seo_onsite_score);

-- Enable Row Level Security (RLS)
ALTER TABLE complete_audits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage audits (for API routes)
CREATE POLICY "Service role can manage audits"
  ON complete_audits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy to allow authenticated users to view audits for their assigned leads
CREATE POLICY "Users can view audits for their assigned leads"
  ON complete_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = complete_audits.lead_id
      AND leads.assigned_to = auth.uid()
    )
  );

-- Create function to auto-update report_sent_at
CREATE OR REPLACE FUNCTION update_report_sent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_sent = true AND OLD.report_sent = false THEN
    NEW.report_sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update report_sent_at
CREATE TRIGGER trigger_update_report_sent_at
  BEFORE UPDATE ON complete_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_report_sent_at();

-- Create function to auto-update email_opened_at
CREATE OR REPLACE FUNCTION update_email_opened_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_opened = true AND OLD.email_opened = false THEN
    NEW.email_opened_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update email_opened_at
CREATE TRIGGER trigger_update_email_opened_at
  BEFORE UPDATE ON complete_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_email_opened_at();

-- Add comments for documentation
COMMENT ON TABLE complete_audits IS 'Stores complete audit results for leads';
COMMENT ON COLUMN complete_audits.seo_local_score IS 'Local SEO score (0-100)';
COMMENT ON COLUMN complete_audits.seo_onsite_score IS 'On-site SEO score (0-100)';
COMMENT ON COLUMN complete_audits.citation_coverage IS 'Citation coverage percentage (0-100)';
COMMENT ON COLUMN complete_audits.keyword_count IS 'Number of keyword opportunities found';
COMMENT ON COLUMN complete_audits.raw_seo_data IS 'Optional: Full SEO API response for debugging';
COMMENT ON COLUMN complete_audits.raw_citation_data IS 'Optional: Full citation API response for debugging';
COMMENT ON COLUMN complete_audits.raw_keyword_data IS 'Optional: Full keyword API response for debugging';
