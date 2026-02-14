-- Direct RLS Policy Fix
-- This file bypasses migration conflicts

-- Step 1: Remove problematic policies
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "sr_sel_auth" ON shift_requests;

-- Step 2: Create correct policy
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- Step 3: Add documentation
COMMENT ON POLICY "Allow view shift requests" ON shift_requests IS
'Pharmacists can view their own requests, admins can view all. Fixed with direct SELECT instead of EXISTS.';

-- Verify the policy was created
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies
WHERE tablename = 'shift_requests'
  AND policyname = 'Allow view shift requests';
