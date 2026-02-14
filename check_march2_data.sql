-- Verify shift_requests data for March 2nd, 2026
-- Execute this in Supabase Dashboard SQL Editor

-- 1. Count total shift_requests for 2026-03-02
SELECT
  COUNT(*) as count_march_2nd,
  '3月2日のshift_requests件数' as description
FROM shift_requests
WHERE date::text LIKE '2026-03-02%';

-- 2. Show all shift_requests for 2026-03-02
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

-- 3. Verify total shift_requests count
SELECT
  COUNT(*) as total_count,
  '全shift_requests件数' as description
FROM shift_requests;

-- 4. Check if there are any records with different date formats
SELECT
  DISTINCT date::text as date_value,
  COUNT(*) as count
FROM shift_requests
WHERE date::text LIKE '2026-03%'
GROUP BY date::text
ORDER BY date::text;
