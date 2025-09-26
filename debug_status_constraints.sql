-- debug_status_constraints.sql
-- Check if the status constraints are properly applied

-- 1. Check shift_postings status constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'shift_postings'::regclass 
  AND contype = 'c' 
  AND conname LIKE '%status%';

-- 2. Check shift_requests status constraint  
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'shift_requests'::regclass 
  AND contype = 'c' 
  AND conname LIKE '%status%';

-- 3. Check current status values in shift_postings
SELECT status, COUNT(*) 
FROM shift_postings 
GROUP BY status;

-- 4. Check current status values in shift_requests
SELECT status, COUNT(*) 
FROM shift_requests 
GROUP BY status;

-- 5. Check for invalid pharmacy_id values in shift_postings
SELECT 
  pharmacy_id, 
  COUNT(*) as count,
  CASE 
    WHEN pharmacy_id = '00000000-0000-0000-0000-000000000000' THEN 'INVALID_ZERO_UUID'
    WHEN pharmacy_id IS NULL THEN 'NULL'
    WHEN LENGTH(pharmacy_id::text) != 36 THEN 'INVALID_FORMAT'
    ELSE 'VALID'
  END as status
FROM shift_postings 
GROUP BY pharmacy_id
ORDER BY count DESC;

-- 6. Check if there are any shift_postings with invalid pharmacy_id
SELECT COUNT(*) as invalid_pharmacy_ids
FROM shift_postings 
WHERE pharmacy_id = '00000000-0000-0000-0000-000000000000' 
   OR pharmacy_id IS NULL;

-- 6. Check if the migration was applied by looking at migration history
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version = '20250127000000' 
ORDER BY version DESC;
