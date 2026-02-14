-- Fix policy without using is_admin() function
-- Use direct subquery instead
-- Execute this in Supabase Dashboard SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "shift_requests_select" ON shift_requests;

-- Create new policy with direct subquery (no function call)
CREATE POLICY "shift_requests_select"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  -- Pharmacists can see their own requests
  pharmacist_id = auth.uid()
  OR
  -- Admins can see all requests
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.user_type = 'admin'
  )
);

-- Verify the policy
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests';

COMMENT ON POLICY "shift_requests_select" ON shift_requests IS
'Pharmacists can view their own shift requests. Admins can view all shift requests. Uses EXISTS subquery to check user_type.';
