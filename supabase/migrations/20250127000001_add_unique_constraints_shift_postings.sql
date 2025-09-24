-- Add unique constraint to prevent duplicate shift postings
-- This prevents the same pharmacy from posting multiple shifts for the same date, store, and time slot

-- First, remove any existing duplicates
WITH duplicates AS (
  SELECT 
    pharmacy_id, 
    date, 
    store_name, 
    time_slot,
    MIN(id) as keep_id,
    COUNT(*) as duplicate_count
  FROM shift_postings 
  GROUP BY pharmacy_id, date, store_name, time_slot
  HAVING COUNT(*) > 1
),
duplicate_ids AS (
  SELECT sp.id
  FROM shift_postings sp
  JOIN duplicates d ON (
    sp.pharmacy_id = d.pharmacy_id AND
    sp.date = d.date AND
    sp.store_name = d.store_name AND
    sp.time_slot = d.time_slot AND
    sp.id != d.keep_id
  )
)
DELETE FROM shift_postings 
WHERE id IN (SELECT id FROM duplicate_ids);

-- Add unique constraint to prevent future duplicates
ALTER TABLE shift_postings 
ADD CONSTRAINT shift_postings_unique_posting 
UNIQUE (pharmacy_id, date, store_name, time_slot);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT shift_postings_unique_posting ON shift_postings 
IS 'Prevents duplicate postings for the same pharmacy, date, store, and time slot';
