-- Fix RLS policies for assigned_shifts table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Users can view assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admin can update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admin can delete assigned shifts" ON assigned_shifts;

-- Create new policies
DROP POLICY IF EXISTS "Admin can insert assigned shifts" ON assigned_shifts;
CREATE POLICY "Admin can insert assigned shifts" ON assigned_shifts
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view assigned shifts" ON assigned_shifts;
CREATE POLICY "Users can view assigned shifts" ON assigned_shifts
FOR SELECT USING (auth.uid() = pharmacist_id OR auth.uid() = pharmacy_id);

DROP POLICY IF EXISTS "Admin can update assigned shifts" ON assigned_shifts;
CREATE POLICY "Admin can update assigned shifts" ON assigned_shifts
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admin can delete assigned shifts" ON assigned_shifts;
CREATE POLICY "Admin can delete assigned shifts" ON assigned_shifts
FOR DELETE USING (true);

-- Ensure RLS is enabled
ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;
