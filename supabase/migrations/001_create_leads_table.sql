-- Create leads table
-- This table stores contact information from the complete audit form

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact Information
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Business Information
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  street TEXT,
  city TEXT NOT NULL,
  zip TEXT,
  category TEXT NOT NULL,

  -- Lead Management
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'complete_audit',

  -- Notes and tracking
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business_name ON leads(business_name);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert/read (for API routes)
CREATE POLICY "Service role can manage leads"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy to allow authenticated users to read their assigned leads
CREATE POLICY "Users can view their assigned leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Stores lead information from complete audit form submissions';
COMMENT ON COLUMN leads.status IS 'Lead status: new, contacted, qualified, converted, lost';
COMMENT ON COLUMN leads.source IS 'Where the lead came from: complete_audit, seo_snapshot, etc.';
