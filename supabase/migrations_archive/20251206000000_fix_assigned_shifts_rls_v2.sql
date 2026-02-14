-- Fix RLS policies for assigned_shifts table (v2)
-- This migration ensures admin users can insert assigned shifts

-- Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Admin can insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Users can view assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admin can update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admin can delete assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Pharmacists can view their assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Pharmacies can view their assigned shifts" ON assigned_shifts;

-- Enable RLS
ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;

-- Create permissive INSERT policy for ALL users
-- This allows any authenticated user to insert shifts (admin matching system needs this)
DROP POLICY IF EXISTS "Allow authenticated inserts" ON assigned_shifts;
CREATE POLICY "Allow authenticated inserts" ON assigned_shifts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policies
DROP POLICY IF EXISTS "Users can view their assigned shifts" ON assigned_shifts;
CREATE POLICY "Users can view their assigned shifts" ON assigned_shifts
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Create UPDATE policy
DROP POLICY IF EXISTS "Admins and shift owners can update" ON assigned_shifts;
CREATE POLICY "Admins and shift owners can update" ON assigned_shifts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Create DELETE policy
DROP POLICY IF EXISTS "Admins can delete shifts" ON assigned_shifts;
CREATE POLICY "Admins can delete shifts" ON assigned_shifts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
