-- Fix store_name in shift_postings table
-- Update store_name to use user_profiles.store_name where available
-- This ensures that shift_postings.store_name contains actual store names, not pharmacy company names

-- Update shift_postings.store_name from user_profiles.store_name
UPDATE shift_postings sp
SET store_name = COALESCE(
  up.store_name,  -- Use store_name from user_profiles if available
  sp.store_name    -- Keep existing value as fallback
)
FROM user_profiles up
WHERE sp.pharmacy_id = up.id
  AND up.store_name IS NOT NULL
  AND up.store_name != ''
  AND up.store_name != up.name;  -- Only update if store_name is different from pharmacy name

-- Add comment
COMMENT ON TABLE shift_postings IS
'Shift postings table. store_name updated to use user_profiles.store_name on 2025-12-06.';
