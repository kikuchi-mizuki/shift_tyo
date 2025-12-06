-- Check user_profiles store_name values
SELECT
  id,
  name,
  store_name,
  user_type
FROM user_profiles
WHERE user_type = 'pharmacy'
ORDER BY name;

-- Check shift_postings store_name values
SELECT
  id,
  pharmacy_id,
  store_name,
  date,
  start_time,
  end_time
FROM shift_postings
WHERE date = '2025-11-01'
ORDER BY pharmacy_id, store_name;
