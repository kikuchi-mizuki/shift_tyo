-- Set default store names for pharmacies in user_profiles
-- This migration sets store_name based on pharmacy company names for testing purposes
-- In production, pharmacies should set their own store names through the UI

-- Update user_profiles.store_name for pharmacies where it's currently NULL or empty
-- Use a generic store name pattern based on the pharmacy name
UPDATE user_profiles
SET store_name = CASE
  -- Remove company type prefixes (株式会社, 合同会社, 有限会社) to create store names
  WHEN name LIKE '株式会社%' THEN REGEXP_REPLACE(name, '^株式会社', '') || '本店'
  WHEN name LIKE '合同会社%' THEN REGEXP_REPLACE(name, '^合同会社', '')
  WHEN name LIKE '有限会社%' THEN REGEXP_REPLACE(name, '^有限会社', '') || '本店'
  WHEN name LIKE '％' THEN REGEXP_REPLACE(name, '^[^%]+％', '') || '本店'
  ELSE name  -- Fallback to pharmacy name if no prefix match
END
WHERE user_type = 'pharmacy'
  AND (store_name IS NULL OR store_name = '' OR store_name = name);

-- Now update shift_postings to use these new store names
UPDATE shift_postings sp
SET store_name = up.store_name
FROM user_profiles up
WHERE sp.pharmacy_id = up.id
  AND up.user_type = 'pharmacy'
  AND up.store_name IS NOT NULL
  AND up.store_name != '';

-- Update assigned_shifts as well
UPDATE assigned_shifts asgn
SET store_name = up.store_name
FROM user_profiles up
WHERE asgn.pharmacy_id = up.id
  AND up.user_type = 'pharmacy'
  AND up.store_name IS NOT NULL
  AND up.store_name != '';

-- Add comment
COMMENT ON COLUMN user_profiles.store_name IS
'Store name for the pharmacy. Auto-generated from pharmacy name on 2025-12-06 if not set. Pharmacies should update this to their actual store names.';
