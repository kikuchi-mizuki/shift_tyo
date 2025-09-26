-- fix_invalid_pharmacy_ids.sql
-- Fix invalid pharmacy_id values in shift_postings table

-- 1. First, let's see what invalid data we have
SELECT 
  id,
  pharmacy_id,
  date,
  time_slot,
  store_name,
  status,
  created_at
FROM shift_postings 
WHERE pharmacy_id = '00000000-0000-0000-0000-000000000000' 
   OR pharmacy_id IS NULL
ORDER BY created_at DESC;

-- 2. Get valid pharmacy IDs from user_profiles
SELECT id, name, user_type 
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY created_at DESC;

-- 3. If you want to delete invalid records (CAREFUL - this will delete data)
-- DELETE FROM shift_postings 
-- WHERE pharmacy_id = '00000000-0000-0000-0000-000000000000' 
--    OR pharmacy_id IS NULL;

-- 4. If you want to update invalid records to a valid pharmacy_id (replace with actual ID)
-- UPDATE shift_postings 
-- SET pharmacy_id = 'REPLACE_WITH_VALID_PHARMACY_ID'
-- WHERE pharmacy_id = '00000000-0000-0000-0000-000000000000' 
--    OR pharmacy_id IS NULL;
