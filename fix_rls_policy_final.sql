-- Final RLS policy fix for shift_requests
-- Execute this in Supabase Dashboard SQL Editor
-- This will completely reset and fix the admin access issue

-- Step 1: Drop ALL existing policies on shift_requests
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shift_requests', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 2: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create new SELECT policy using the helper function
CREATE POLICY "shift_requests_select"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  pharmacist_id = auth.uid()  -- Pharmacists see their own
  OR
  is_admin()  -- Admins see all
);

-- Step 4: Verify the policy was created
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests';

COMMENT ON POLICY "shift_requests_select" ON shift_requests IS
'Pharmacists can view their own shift requests. Admins can view all shift requests. Uses is_admin() helper function.';

COMMENT ON FUNCTION is_admin() IS
'Helper function to check if the current user is an admin. Returns true if user_type = admin.';
