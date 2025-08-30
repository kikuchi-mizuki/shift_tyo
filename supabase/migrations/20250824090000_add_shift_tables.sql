-- Create shift_requests table
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  priority TEXT NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_postings table
CREATE TABLE IF NOT EXISTS shift_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  required_staff INTEGER DEFAULT 1,
  memo TEXT,
  status TEXT DEFAULT 'recruiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assigned_shifts table
CREATE TABLE IF NOT EXISTS assigned_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_requests
CREATE POLICY "Users can view their own shift requests" ON shift_requests
  FOR SELECT USING (auth.uid() = pharmacist_id);

CREATE POLICY "Users can insert their own shift requests" ON shift_requests
  FOR INSERT WITH CHECK (auth.uid() = pharmacist_id);

CREATE POLICY "Users can update their own shift requests" ON shift_requests
  FOR UPDATE USING (auth.uid() = pharmacist_id);

-- RLS Policies for shift_postings
CREATE POLICY "Users can view shift postings" ON shift_postings
  FOR SELECT USING (true);

CREATE POLICY "Pharmacy users can insert shift postings" ON shift_postings
  FOR INSERT WITH CHECK (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacy users can update their shift postings" ON shift_postings
  FOR UPDATE USING (auth.uid() = pharmacy_id);

-- RLS Policies for assigned_shifts
CREATE POLICY "Users can view assigned shifts" ON assigned_shifts
  FOR SELECT USING (auth.uid() = pharmacist_id OR auth.uid() = pharmacy_id);

CREATE POLICY "Admin can insert assigned shifts" ON assigned_shifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update assigned shifts" ON assigned_shifts
  FOR UPDATE USING (true);
