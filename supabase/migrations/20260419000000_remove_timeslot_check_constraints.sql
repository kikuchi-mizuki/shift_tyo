-- Remove time_slot CHECK constraints to allow flexible time values
-- This allows the system to use start_time and end_time instead of fixed time_slot categories

-- Drop CHECK constraints from all tables
ALTER TABLE shift_requests DROP CONSTRAINT IF EXISTS shift_requests_time_slot_check;
ALTER TABLE shift_postings DROP CONSTRAINT IF EXISTS shift_postings_time_slot_check;
ALTER TABLE assigned_shifts DROP CONSTRAINT IF EXISTS assigned_shifts_time_slot_check;

-- Make time_slot nullable in all tables
ALTER TABLE shift_requests ALTER COLUMN time_slot DROP NOT NULL;
ALTER TABLE shift_postings ALTER COLUMN time_slot DROP NOT NULL;
ALTER TABLE assigned_shifts ALTER COLUMN time_slot DROP NOT NULL;

-- Add comments to indicate time_slot is optional
COMMENT ON COLUMN shift_requests.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
COMMENT ON COLUMN shift_postings.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
COMMENT ON COLUMN assigned_shifts.time_slot IS 'Time slot (optional, use start_time and end_time instead)';
