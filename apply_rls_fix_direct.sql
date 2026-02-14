-- This SQL must be executed directly in Supabase Dashboard SQL Editor
-- Copy and paste this entire file and click Run

DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "sr_sel_auth" ON shift_requests;

CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

COMMENT ON POLICY "Allow view shift requests" ON shift_requests IS
'Pharmacists can view their own requests, admins can view all. Fixed with direct SELECT instead of EXISTS.';
