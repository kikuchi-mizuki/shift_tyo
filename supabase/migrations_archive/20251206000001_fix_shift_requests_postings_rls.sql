-- Fix RLS policies for shift_requests and shift_postings tables
-- This migration allows admins to view all requests and postings

-- ============================================
-- shift_requests RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Users can insert their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Users can update their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admin can view all shift requests" ON shift_requests;

-- Enable RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow users to view their own requests, and admins to view all
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- INSERT: Allow users to insert their own requests
DROP POLICY IF EXISTS "Allow insert own shift requests" ON shift_requests;
CREATE POLICY "Allow insert own shift requests" ON shift_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = pharmacist_id);

-- UPDATE: Allow users to update their own requests
DROP POLICY IF EXISTS "Allow update own shift requests" ON shift_requests;
CREATE POLICY "Allow update own shift requests" ON shift_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = pharmacist_id);

-- DELETE: Allow users to delete their own requests, admins to delete all
DROP POLICY IF EXISTS "Allow delete shift requests" ON shift_requests;
CREATE POLICY "Allow delete shift requests" ON shift_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- ============================================
-- shift_postings RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacy users can insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacy users can update their shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admin can view all shift postings" ON shift_postings;

-- Enable RLS
ALTER TABLE shift_postings ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow everyone to view all postings (public marketplace)
DROP POLICY IF EXISTS "Allow view all shift postings" ON shift_postings;
CREATE POLICY "Allow view all shift postings" ON shift_postings
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Allow pharmacy users to insert their own postings
DROP POLICY IF EXISTS "Allow insert own shift postings" ON shift_postings;
CREATE POLICY "Allow insert own shift postings" ON shift_postings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = pharmacy_id);

-- UPDATE: Allow pharmacy users to update their own postings, admins to update all
DROP POLICY IF EXISTS "Allow update shift postings" ON shift_postings;
CREATE POLICY "Allow update shift postings" ON shift_postings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- DELETE: Allow pharmacy users to delete their own postings, admins to delete all
DROP POLICY IF EXISTS "Allow delete shift postings" ON shift_postings;
CREATE POLICY "Allow delete shift postings" ON shift_postings
FOR DELETE
TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
