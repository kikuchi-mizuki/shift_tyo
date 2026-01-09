-- Test query: Preview store_names extraction from shift_postings
-- Run this BEFORE applying the migration to see what will be updated

SELECT
  up.id,
  up.name as pharmacy_name,
  up.email,
  up.store_names as current_store_names,
  array_length(up.store_names, 1) as current_count,
  (
    SELECT ARRAY_AGG(DISTINCT store_name ORDER BY store_name)
    FROM shift_postings sp
    WHERE sp.pharmacy_id = up.id
      AND sp.store_name IS NOT NULL
      AND sp.store_name != ''
  ) as extracted_store_names,
  (
    SELECT COUNT(DISTINCT store_name)
    FROM shift_postings sp
    WHERE sp.pharmacy_id = up.id
      AND sp.store_name IS NOT NULL
      AND sp.store_name != ''
  ) as extracted_count,
  (
    SELECT STRING_AGG(DISTINCT store_name, ', ' ORDER BY store_name)
    FROM shift_postings sp
    WHERE sp.pharmacy_id = up.id
      AND sp.store_name IS NOT NULL
      AND sp.store_name != ''
  ) as store_list_preview
FROM user_profiles up
WHERE up.user_type IN ('pharmacy', 'store')
ORDER BY up.name;

-- Summary: Count pharmacies with stores
SELECT
  COUNT(*) as total_pharmacies,
  COUNT(CASE WHEN store_count > 0 THEN 1 END) as pharmacies_with_stores,
  SUM(store_count) as total_stores
FROM (
  SELECT
    up.id,
    (
      SELECT COUNT(DISTINCT store_name)
      FROM shift_postings sp
      WHERE sp.pharmacy_id = up.id
        AND sp.store_name IS NOT NULL
        AND sp.store_name != ''
    ) as store_count
  FROM user_profiles up
  WHERE up.user_type IN ('pharmacy', 'store')
) subquery;
