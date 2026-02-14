-- Fix is_admin() function by recreating policy and function
-- Execute this in Supabase Dashboard SQL Editor

-- Step 1: Drop the policy that depends on is_admin()
DROP POLICY IF EXISTS "shift_requests_select" ON shift_requests;

-- Step 2: Drop the is_admin() function
DROP FUNCTION IF EXISTS is_admin();

-- Step 3: Recreate is_admin() function with proper settings
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type text;
BEGIN
  -- Get user_type for the current authenticated user
  SELECT user_type INTO v_user_type
  FROM user_profiles
  WHERE id = auth.uid();

  -- Return true if user_type is 'admin', false otherwise
  RETURN (v_user_type = 'admin');
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Step 5: Recreate the policy
CREATE POLICY "shift_requests_select"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  pharmacist_id = auth.uid()  -- Pharmacists see their own
  OR
  is_admin()  -- Admins see all
);

-- Step 6: Verify
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests';

-- Add comment
COMMENT ON POLICY "shift_requests_select" ON shift_requests IS
'Pharmacists can view their own shift requests. Admins can view all shift requests. Uses is_admin() helper function with SECURITY DEFINER.';

COMMENT ON FUNCTION is_admin() IS
'Returns true if the current authenticated user has user_type = admin. Uses SECURITY DEFINER to bypass RLS on user_profiles table.';
