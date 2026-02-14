-- Fix is_admin() function with proper SECURITY DEFINER and permissions
-- Execute this in Supabase Dashboard SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS is_admin();

-- Recreate with proper settings
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Test the function (this will show false in SQL Editor because auth.uid() is NULL)
SELECT
  auth.uid() as current_user,
  is_admin() as is_admin_result;

-- Verify the policy
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests';

COMMENT ON FUNCTION is_admin() IS
'Returns true if the current authenticated user has user_type = admin. Uses SECURITY DEFINER to bypass RLS on user_profiles table.';
