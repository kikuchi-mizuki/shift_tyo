-- Check existing policies first
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';

-- Drop all existing policies (using different approach)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'recruitment_status'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON recruitment_status', policy_record.policyname);
    END LOOP;
END $$;

-- Create a new policy with a unique name
CREATE POLICY "recruitment_status_global_access" ON recruitment_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON recruitment_status TO authenticated;
