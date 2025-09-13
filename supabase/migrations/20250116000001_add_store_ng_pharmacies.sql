-- Create store_ng_pharmacies table for store-specific NG pharmacy settings by pharmacists
CREATE TABLE IF NOT EXISTS store_ng_pharmacies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacist_id, pharmacy_id, store_name)
);

-- Enable RLS
ALTER TABLE store_ng_pharmacies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_ng_pharmacies
CREATE POLICY "Pharmacists can view their store NG pharmacies" ON store_ng_pharmacies
  FOR SELECT USING (auth.uid() = pharmacist_id);

CREATE POLICY "Pharmacists can insert their store NG pharmacies" ON store_ng_pharmacies
  FOR INSERT WITH CHECK (auth.uid() = pharmacist_id);

CREATE POLICY "Pharmacists can update their store NG pharmacies" ON store_ng_pharmacies
  FOR UPDATE USING (auth.uid() = pharmacist_id);

CREATE POLICY "Pharmacists can delete their store NG pharmacies" ON store_ng_pharmacies
  FOR DELETE USING (auth.uid() = pharmacist_id);

-- Admin can manage all store NG pharmacies
CREATE POLICY "Admins can manage all store NG pharmacies" ON store_ng_pharmacies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacies_pharmacist 
  ON store_ng_pharmacies(pharmacist_id);

CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacies_pharmacy_store 
  ON store_ng_pharmacies(pharmacy_id, store_name);

-- Add updated_at trigger
CREATE TRIGGER update_store_ng_pharmacies_updated_at
  BEFORE UPDATE ON store_ng_pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the purpose
COMMENT ON TABLE store_ng_pharmacies IS 'Store-specific NG pharmacy settings by pharmacists';
COMMENT ON COLUMN store_ng_pharmacies.pharmacist_id IS 'Pharmacist who set the NG';
COMMENT ON COLUMN store_ng_pharmacies.pharmacy_id IS 'Pharmacy that is NG';
COMMENT ON COLUMN store_ng_pharmacies.store_name IS 'Specific store name that is NG';
