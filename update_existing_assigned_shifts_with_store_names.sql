-- Update existing assigned_shifts with store names from shift_postings
-- This script updates existing assigned shifts with store names from their corresponding postings

-- First, let's see what data we have
SELECT 
  'assigned_shifts' as table_name,
  COUNT(*) as count
FROM assigned_shifts
UNION ALL
SELECT 
  'shift_postings' as table_name,
  COUNT(*) as count
FROM shift_postings;

-- Update assigned_shifts with store names from shift_postings
-- This matches by date, time_slot, and pharmacy_id
UPDATE assigned_shifts 
SET 
  store_name = COALESCE(
    NULLIF(TRIM(sp.store_name), ''),  -- Direct store_name from posting
    CASE 
      WHEN sp.memo ~ '\[store:([^\]]+)\]' 
      THEN (regexp_match(sp.memo, '\[store:([^\]]+)\]'))[1]
      ELSE NULL
    END  -- Extract from memo [store:name] format
  ),
  memo = COALESCE(assigned_shifts.memo, sp.memo)
FROM shift_postings sp
WHERE assigned_shifts.date = sp.date 
  AND assigned_shifts.time_slot = sp.time_slot 
  AND assigned_shifts.pharmacy_id = sp.pharmacy_id
  AND (assigned_shifts.store_name IS NULL OR assigned_shifts.store_name = '');

-- Verify the update
SELECT 
  id,
  date,
  time_slot,
  store_name,
  memo,
  created_at
FROM assigned_shifts 
WHERE store_name IS NOT NULL 
  AND store_name != ''
ORDER BY created_at DESC
LIMIT 10;

-- Show count of updated records
SELECT 
  COUNT(*) as total_assigned_shifts,
  COUNT(store_name) as shifts_with_store_name,
  COUNT(*) - COUNT(store_name) as shifts_without_store_name
FROM assigned_shifts;
