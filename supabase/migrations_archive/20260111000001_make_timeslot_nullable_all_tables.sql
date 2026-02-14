-- Make time_slot column nullable and remove CHECK constraints
-- The system now uses start_time and end_time instead of time_slot categories

-- 1. Drop CHECK constraints
ALTER TABLE shift_requests DROP CONSTRAINT IF EXISTS shift_requests_time_slot_check;
ALTER TABLE shift_postings DROP CONSTRAINT IF EXISTS shift_postings_time_slot_check;
ALTER TABLE assigned_shifts DROP CONSTRAINT IF EXISTS assigned_shifts_time_slot_check;

-- 2. Make time_slot nullable
ALTER TABLE shift_requests ALTER COLUMN time_slot DROP NOT NULL;
ALTER TABLE shift_postings ALTER COLUMN time_slot DROP NOT NULL;
-- assigned_shifts already nullable from previous migration

-- 3. Set default value for existing NULL records
UPDATE shift_requests SET time_slot = 'fullday' WHERE time_slot IS NULL;
UPDATE shift_postings SET time_slot = 'fullday' WHERE time_slot IS NULL;
UPDATE assigned_shifts SET time_slot = 'fullday' WHERE time_slot IS NULL;

-- 4. Add comments
COMMENT ON COLUMN shift_requests.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
COMMENT ON COLUMN shift_postings.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
COMMENT ON COLUMN assigned_shifts.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
