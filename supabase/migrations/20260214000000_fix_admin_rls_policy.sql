-- Fix RLS policy for admin users to view all shift_requests
-- The EXISTS clause was not working properly, so we use a direct SELECT instead

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;

-- Create a new SELECT policy that works correctly for admins
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  -- Users can see their own requests
  auth.uid() = pharmacist_id
  OR
  -- Admins can see all requests (using direct SELECT instead of EXISTS)
  (
    SELECT user_type FROM user_profiles
    WHERE id = auth.uid()
    LIMIT 1
  ) = 'admin'
);

-- Add comment to document the fix
COMMENT ON POLICY "Allow view shift requests" ON shift_requests IS
'Allow users to view their own shift requests, and admins to view all. Fixed to use direct SELECT instead of EXISTS for better compatibility.';
