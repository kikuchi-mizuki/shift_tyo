-- Migration: Populate store_names from existing pharmacy names
-- Date: 2026-01-10
-- Purpose: Extract store names from pharmacy names and populate store_names array

-- For pharmacies where store_names is empty, extract the store name from the name field
-- Examples:
-- "株式会社グラム" -> ["グラム"]
-- "有限会社フラワーズ(フラワー)" -> ["フラワー"]
-- "株式会社Re-pharame(つばさ薬局)" -> ["つばさ薬局"]

UPDATE user_profiles
SET store_names = ARRAY[
  CASE
    -- Extract name from parentheses if exists
    WHEN name ~ '\([^)]+\)' THEN
      regexp_replace(regexp_replace(name, '.*\(([^)]+)\).*', '\1'), '薬局$', '')
    -- Remove company prefixes and suffixes
    WHEN name ~ '^(株式会社|有限会社|合同会社)' THEN
      regexp_replace(
        regexp_replace(name, '^(株式会社|有限会社|合同会社)', ''),
        '薬局$',
        ''
      )
    -- Use name as-is, remove '薬局' suffix if exists
    ELSE
      regexp_replace(name, '薬局$', '')
  END
]
WHERE user_type IN ('pharmacy', 'store')
  AND (store_names IS NULL OR array_length(store_names, 1) = 0 OR array_length(store_names, 1) IS NULL)
  AND name IS NOT NULL
  AND name != '';

-- Trim whitespace from store names
UPDATE user_profiles
SET store_names = ARRAY(
  SELECT trim(unnest(store_names))
  FROM (SELECT store_names FROM user_profiles up WHERE up.id = user_profiles.id) sub
)
WHERE user_type IN ('pharmacy', 'store')
  AND store_names IS NOT NULL
  AND array_length(store_names, 1) > 0;
