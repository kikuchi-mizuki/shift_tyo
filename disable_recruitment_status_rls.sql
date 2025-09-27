-- Temporarily disable RLS for recruitment_status table to allow updates
-- This is a global table that should be manageable by admins

-- Disable RLS temporarily
ALTER TABLE recruitment_status DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'recruitment_status';

-- Grant all permissions to authenticated users
GRANT ALL ON recruitment_status TO authenticated;
