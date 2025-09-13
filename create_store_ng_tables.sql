-- Create store_ng_pharmacists table
-- This table stores which pharmacists are NG (Not Good) for specific stores of a pharmacy

CREATE TABLE IF NOT EXISTS store_ng_pharmacists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  pharmacist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacy_id, store_name, pharmacist_id)
);

-- Create store_ng_pharmacies table
-- This table stores which pharmacy stores are NG (Not Good) for specific pharmacists

CREATE TABLE IF NOT EXISTS store_ng_pharmacies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacist_id, pharmacy_id, store_name)
);

-- Enable RLS
ALTER TABLE store_ng_pharmacists ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_ng_pharmacies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_ng_pharmacists
-- Pharmacies can manage their own store NG pharmacists
CREATE POLICY "Pharmacies can manage own store NG pharmacists" ON store_ng_pharmacists
  FOR ALL USING (
    pharmacy_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacy'
    )
  );

-- Pharmacists can view their own NG status
CREATE POLICY "Pharmacists can view own NG status" ON store_ng_pharmacists
  FOR SELECT USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacist'
    )
  );

-- Admins can manage all store NG pharmacists
CREATE POLICY "Admins can manage all store NG pharmacists" ON store_ng_pharmacists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- RLS Policies for store_ng_pharmacies
-- Pharmacists can manage their own store NG pharmacies
CREATE POLICY "Pharmacists can manage own store NG pharmacies" ON store_ng_pharmacies
  FOR ALL USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacist'
    )
  );

-- Pharmacies can view their own NG status
CREATE POLICY "Pharmacies can view own NG status" ON store_ng_pharmacies
  FOR SELECT USING (
    pharmacy_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacy'
    )
  );

-- Admins can manage all store NG pharmacies
CREATE POLICY "Admins can manage all store NG pharmacies" ON store_ng_pharmacies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacists_pharmacy_id ON store_ng_pharmacists(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacists_pharmacist_id ON store_ng_pharmacists(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacists_store_name ON store_ng_pharmacists(store_name);

CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacies_pharmacist_id ON store_ng_pharmacies(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacies_pharmacy_id ON store_ng_pharmacies(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_store_ng_pharmacies_store_name ON store_ng_pharmacies(store_name);

-- Add comments
COMMENT ON TABLE store_ng_pharmacists IS 'Stores which pharmacists are NG for specific stores of a pharmacy';
COMMENT ON TABLE store_ng_pharmacies IS 'Stores which pharmacy stores are NG for specific pharmacists';
