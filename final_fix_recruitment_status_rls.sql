-- Final fix for recruitment_status RLS policies
-- First, let's see what policies currently exist

SELECT 'Current policies:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';

-- Drop ALL existing policies for recruitment_status table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'recruitment_status'
    LOOP
        EXECUTE format('DROP POLICY %I ON recruitment_status', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Verify all policies are removed
SELECT 'After cleanup:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';

-- Create a single, clean policy with a unique name
CREATE POLICY "recruitment_status_clean_policy" ON recruitment_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON recruitment_status TO authenticated;

-- Final verification
SELECT 'Final result:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';
