-- Temporarily disable RLS to verify actual data count
-- Execute this in Supabase Dashboard SQL Editor

-- Disable RLS temporarily
ALTER TABLE shift_requests DISABLE ROW LEVEL SECURITY;

-- Count March 2nd records
SELECT COUNT(*) as march_2nd_count
FROM shift_requests
WHERE date::text LIKE '2026-03-02%';

-- Show all March 2nd records
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at
FROM shift_requests
WHERE date::text LIKE '2026-03-02%'
ORDER BY created_at;

-- Re-enable RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- Confirm RLS is back on
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'shift_requests';
