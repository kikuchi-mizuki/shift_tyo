-- Allow admins to insert shift postings on behalf of pharmacies
-- This enables admin dashboard to add shift postings for any pharmacy

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow insert own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow pharmacies to insert postings" ON shift_postings;

-- Recreate INSERT policy: Allow users to insert their own postings, OR admins to insert any
DROP POLICY IF EXISTS "Allow insert shift postings" ON shift_postings;
CREATE POLICY "Allow insert shift postings" ON shift_postings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Also update the UPDATE policy for consistency
DROP POLICY IF EXISTS "Allow update own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow pharmacies to update postings" ON shift_postings;

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
