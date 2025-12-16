-- Check assigned_shifts data for November 2025
SELECT
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  store_name,
  status,
  start_time,
  end_time,
  memo,
  created_at
FROM assigned_shifts
WHERE date >= '2025-11-01' AND date < '2025-12-01'
  AND status = 'pending'
ORDER BY date, created_at DESC;
