-- Create pharmacist_ratings table for rating pharmacists after shifts
CREATE TABLE IF NOT EXISTS pharmacist_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_shift_id UUID NOT NULL REFERENCES assigned_shifts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacy_id, pharmacist_id, assigned_shift_id)
);

-- Enable RLS
ALTER TABLE pharmacist_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pharmacist_ratings
-- Pharmacies can view and manage their own ratings
CREATE POLICY "Pharmacies can view their ratings" ON pharmacist_ratings
  FOR SELECT USING (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can insert their ratings" ON pharmacist_ratings
  FOR INSERT WITH CHECK (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can update their ratings" ON pharmacist_ratings
  FOR UPDATE USING (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can delete their ratings" ON pharmacist_ratings
  FOR DELETE USING (auth.uid() = pharmacy_id);

-- Pharmacists can view ratings about themselves
CREATE POLICY "Pharmacists can view their ratings" ON pharmacist_ratings
  FOR SELECT USING (auth.uid() = pharmacist_id);

-- Admins can manage all ratings
CREATE POLICY "Admins can manage all ratings" ON pharmacist_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_pharmacy_id 
  ON pharmacist_ratings(pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_pharmacist_id 
  ON pharmacist_ratings(pharmacist_id);

CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_assigned_shift_id 
  ON pharmacist_ratings(assigned_shift_id);

-- Add updated_at trigger
CREATE TRIGGER update_pharmacist_ratings_updated_at
  BEFORE UPDATE ON pharmacist_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON pharmacist_ratings TO authenticated;
