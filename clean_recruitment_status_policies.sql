-- Clean up all existing policies for recruitment_status table

-- Drop the specific policies that exist
DROP POLICY IF EXISTS "Allow all authenticated users" ON recruitment_status;
DROP POLICY IF EXISTS "Allow all authenticated users to manage recruitment status" ON recruitment_status;

-- Verify all policies are removed
SELECT 'Policies after cleanup:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';

-- Create a single, clean policy
CREATE POLICY "recruitment_status_global_access" ON recruitment_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON recruitment_status TO authenticated;

-- Verify the new policy was created
SELECT 'Final policies:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';
