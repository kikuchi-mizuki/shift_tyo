-- Check pharmacist_ids for all March 2nd records
-- Execute this in Supabase Dashboard SQL Editor

-- Temporarily disable RLS
ALTER TABLE shift_requests DISABLE ROW LEVEL SECURITY;

-- Show all March 2nd records with pharmacist_id
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  -- Check if this is the admin user
  CASE
    WHEN pharmacist_id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3' THEN 'ADMIN USER'
    ELSE 'OTHER USER'
  END as user_match
FROM shift_requests
WHERE date::text LIKE '2026-03-02%'
ORDER BY pharmacist_id;

-- Count by user type
SELECT
  CASE
    WHEN pharmacist_id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3' THEN 'ADMIN USER'
    ELSE 'OTHER USER'
  END as user_type,
  COUNT(*) as count
FROM shift_requests
WHERE date::text LIKE '2026-03-02%'
GROUP BY user_type;

-- Re-enable RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
