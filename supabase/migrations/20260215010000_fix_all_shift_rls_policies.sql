-- Fix RLS policies for all shift-related tables
-- Date: 2026-02-15
-- Purpose: Ensure admin users can access all data while regular users can only access their own

-- ========================================
-- shift_requests table
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can view all shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can view own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can insert own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can update own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can delete own shift requests" ON shift_requests;

-- Create new policies for shift_requests
CREATE POLICY "shift_requests_select_policy"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_insert_policy"
ON shift_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_update_policy"
ON shift_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_delete_policy"
ON shift_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- shift_postings table
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow view shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can view all shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can view own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can insert own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow update shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can update shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can update own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow delete shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can delete shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can delete own shift postings" ON shift_postings;

-- Create new policies for shift_postings
CREATE POLICY "shift_postings_select_policy"
ON shift_postings
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_insert_policy"
ON shift_postings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_update_policy"
ON shift_postings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_delete_policy"
ON shift_postings
FOR DELETE
TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- assigned_shifts table
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow view assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can view all assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Users can view own assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow delete assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can delete assigned shifts" ON assigned_shifts;

-- Create new policies for assigned_shifts
CREATE POLICY "assigned_shifts_select_policy"
ON assigned_shifts
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_insert_policy"
ON assigned_shifts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_update_policy"
ON assigned_shifts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_delete_policy"
ON assigned_shifts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- Add comments for documentation
COMMENT ON POLICY "shift_requests_select_policy" ON shift_requests IS
'Pharmacists can view their own requests. Admins can view all requests.';

COMMENT ON POLICY "shift_postings_select_policy" ON shift_postings IS
'Pharmacies can view their own postings. Admins can view all postings.';

COMMENT ON POLICY "assigned_shifts_select_policy" ON assigned_shifts IS
'Users can view shifts they are involved in. Admins can view all shifts.';
