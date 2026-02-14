-- Fix shift_requests RLS policy to allow admins to view all requests
-- Execute this in Supabase Dashboard SQL Editor

-- Step 1: Create is_admin function for reliable admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop existing policy
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;

-- Step 3: Create new policy using the function
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  public.is_admin()
);

-- Step 4: Verify the policy
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests' AND policyname = 'Allow view shift requests';
