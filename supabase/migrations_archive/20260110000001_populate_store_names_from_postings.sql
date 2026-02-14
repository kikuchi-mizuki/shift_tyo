-- Migration: Populate store_names from shift_postings data
-- Date: 2026-01-10
-- Purpose: Extract actual registered store names from shift_postings table

-- Update store_names for each pharmacy based on their shift postings
UPDATE user_profiles up
SET store_names = (
  SELECT ARRAY(
    SELECT DISTINCT store_name
    FROM shift_postings sp
    WHERE sp.pharmacy_id = up.id
      AND sp.store_name IS NOT NULL
      AND sp.store_name != ''
    ORDER BY store_name
  )
)
WHERE up.user_type IN ('pharmacy', 'store')
  AND EXISTS (
    SELECT 1
    FROM shift_postings sp
    WHERE sp.pharmacy_id = up.id
      AND sp.store_name IS NOT NULL
      AND sp.store_name != ''
  );

-- Verify the update
-- This query shows the result (run separately to check)
-- SELECT
--   up.id,
--   up.name as pharmacy_name,
--   up.store_names,
--   array_length(up.store_names, 1) as store_count
-- FROM user_profiles up
-- WHERE up.user_type IN ('pharmacy', 'store')
--   AND up.store_names IS NOT NULL
--   AND array_length(up.store_names, 1) > 0
-- ORDER BY up.name;
