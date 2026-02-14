-- Create is_admin function for reliable admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policy
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;

-- Create new policy using the function
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  public.is_admin()
);

-- Add comment
COMMENT ON POLICY "Allow view shift requests" ON shift_requests IS
'Pharmacists can view their own requests, admins can view all. Uses is_admin() function for reliable check.';
