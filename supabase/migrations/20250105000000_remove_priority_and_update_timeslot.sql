-- Migration: Remove priority column and update time_slot constraint
-- Date: 2025-01-05
-- Description:
--   1. Remove 'priority' column from shift_requests table
--   2. Update time_slot values to remove 'negotiable'
--   3. Add check constraint to time_slot columns

-- 1. Remove priority column from shift_requests
ALTER TABLE shift_requests DROP COLUMN IF EXISTS priority;

-- 2. Update any 'negotiable' time_slot values to 'fullday' in shift_requests
UPDATE shift_requests
SET time_slot = 'fullday'
WHERE time_slot = 'negotiable';

-- 3. Update any 'negotiable' time_slot values to 'fullday' in shift_postings
UPDATE shift_postings
SET time_slot = 'fullday'
WHERE time_slot = 'negotiable';

-- 4. Update any 'negotiable' time_slot values to 'fullday' in assigned_shifts
UPDATE assigned_shifts
SET time_slot = 'fullday'
WHERE time_slot = 'negotiable';

-- 5. Add check constraint to shift_requests.time_slot
ALTER TABLE shift_requests DROP CONSTRAINT IF EXISTS shift_requests_time_slot_check;
ALTER TABLE shift_requests
ADD CONSTRAINT shift_requests_time_slot_check
CHECK (time_slot IN ('morning', 'afternoon', 'fullday'));

-- 6. Add check constraint to shift_postings.time_slot
ALTER TABLE shift_postings DROP CONSTRAINT IF EXISTS shift_postings_time_slot_check;
ALTER TABLE shift_postings
ADD CONSTRAINT shift_postings_time_slot_check
CHECK (time_slot IN ('morning', 'afternoon', 'fullday'));

-- 7. Add check constraint to assigned_shifts.time_slot
ALTER TABLE assigned_shifts DROP CONSTRAINT IF EXISTS assigned_shifts_time_slot_check;
ALTER TABLE assigned_shifts
ADD CONSTRAINT assigned_shifts_time_slot_check
CHECK (time_slot IN ('morning', 'afternoon', 'fullday'));

-- 8. Add comment to document the changes
COMMENT ON COLUMN shift_requests.time_slot IS 'Time slot: morning, afternoon, or fullday (negotiable removed)';
COMMENT ON COLUMN shift_postings.time_slot IS 'Time slot: morning, afternoon, or fullday (negotiable removed)';
COMMENT ON COLUMN assigned_shifts.time_slot IS 'Time slot: morning, afternoon, or fullday (negotiable removed)';
