-- Enable Row Level Security on shift_requests table
-- Execute this in Supabase Dashboard SQL Editor

-- Enable RLS on shift_requests
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'shift_requests';

-- Show current policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shift_requests';
