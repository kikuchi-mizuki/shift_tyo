-- Create store_ng_pharmacists table for store-specific NG pharmacist settings
CREATE TABLE IF NOT EXISTS store_ng_pharmacists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  pharmacist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacy_id, store_name, pharmacist_id)
);

-- Enable RLS
ALTER TABLE store_ng_pharmacists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_ng_pharmacists
DROP POLICY IF EXISTS "Pharmacy users can view their store NG pharmacists" ON store_ng_pharmacists;
DROP POLICY IF EXISTS "Pharmacy users can view their store NG pharmacists" ON store_ng_pharmacists;
CREATE POLICY "Pharmacy users can view their store NG pharmacists" ON store_ng_pharmacists
  FOR SELECT USING (auth.uid() = pharmacy_id);

DROP POLICY IF EXISTS "Pharmacy users can insert their store NG pharmacists" ON store_ng_pharmacists;
DROP POLICY IF EXISTS "Pharmacy users can insert their store NG pharmacists" ON store_ng_pharmacists;
CREATE POLICY "Pharmacy users can insert their store NG pharmacists" ON store_ng_pharmacists
  FOR INSERT WITH CHECK (auth.uid() = pharmacy_id);

DROP POLICY IF EXISTS "Pharmacy users can update their store NG pharmacists" ON store_ng_pharmacists;
DROP POLICY IF EXISTS "Pharmacy users can update their store NG pharmacists" ON store_ng_pharmacists;
CREATE POLICY "Pharmacy users can update their store NG pharmacists" ON store_ng_pharmacists
  FOR UPDATE USING (auth.uid() = pharmacy_id);

DROP POLICY IF EXISTS "Pharmacy users can delete their store NG pharmacists" ON store_ng_pharmacists;
DROP POLICY IF EXISTS "Pharmacy users can delete their store NG pharmacists" ON store_ng_pharmacists;
CREATE POLICY "Pharmacy users can delete their store NG pharmacists" ON store_ng_pharmacists
  FOR DELETE USING (auth.uid() = pharmacy_id);

-- Admin can manage all store NG pharmacists
DROP POLICY IF EXISTS "Admins can manage all store NG pharmacists" ON store_ng_pharmacists;
DROP POLICY IF EXISTS "Admins can manage all store NG pharmacists" ON store_ng_pharmacists;
CREATE POLICY "Admins can manage all store NG pharmacists" ON store_ng_pharmacists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacists_pharmacy_store 
  ON store_ng_pharmacists(pharmacy_id, store_name);

CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacists_pharmacist 
  ON store_ng_pharmacists(pharmacist_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_store_ng_pharmacists_updated_at ON store_ng_pharmacists;
DROP TRIGGER IF EXISTS update_store_ng_pharmacists_updated_at ON store_ng_pharmacists;
CREATE TRIGGER update_store_ng_pharmacists_updated_at
  BEFORE UPDATE ON store_ng_pharmacists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
