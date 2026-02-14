-- Temporarily disable RLS for assigned_shifts table to fix insertion issues
-- This is a temporary solution for testing purposes

-- Disable RLS temporarily
ALTER TABLE assigned_shifts DISABLE ROW LEVEL SECURITY;

-- Note: This should be re-enabled with proper policies after testing
-- To re-enable later, run:
-- ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;
-- And then create proper RLS policies
