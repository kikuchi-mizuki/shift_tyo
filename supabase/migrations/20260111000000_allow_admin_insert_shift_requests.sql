-- Allow admins to insert and update shift requests on behalf of pharmacists
-- This enables admin dashboard to add/edit shift requests for any pharmacist

-- Drop the existing INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow update own shift requests" ON shift_requests;

-- Recreate INSERT policy: Allow users to insert their own requests, OR admins to insert any
CREATE POLICY "Allow insert shift requests" ON shift_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Recreate UPDATE policy: Allow users to update their own requests, OR admins to update any
CREATE POLICY "Allow update shift requests" ON shift_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
