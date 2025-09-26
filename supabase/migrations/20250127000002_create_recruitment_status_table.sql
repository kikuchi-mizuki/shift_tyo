-- Create recruitment_status table to manage global recruitment status
CREATE TABLE IF NOT EXISTS recruitment_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),
  notes TEXT
);

-- Insert default record (open)
INSERT INTO recruitment_status (id, is_open, updated_by, notes) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  NULL,
  'Default recruitment status'
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE recruitment_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage recruitment status
CREATE POLICY "Admins can manage recruitment status" ON recruitment_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- All authenticated users can read recruitment status
CREATE POLICY "Authenticated users can read recruitment status" ON recruitment_status
  FOR SELECT TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON recruitment_status TO authenticated;

-- Add updated_at trigger
CREATE TRIGGER update_recruitment_status_updated_at
  BEFORE UPDATE ON recruitment_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
