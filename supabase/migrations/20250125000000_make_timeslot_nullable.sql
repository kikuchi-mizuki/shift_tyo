-- Make time_slot column nullable in assigned_shifts table
-- Since we only use start_time and end_time for time recording

-- Drop the NOT NULL constraint on time_slot
ALTER TABLE assigned_shifts 
ALTER COLUMN time_slot DROP NOT NULL;

-- Add a default value for existing records
UPDATE assigned_shifts 
SET time_slot = 'negotiable' 
WHERE time_slot IS NULL;

-- Add comment to document the change
COMMENT ON COLUMN assigned_shifts.time_slot IS 'Time slot category (optional, use start_time and end_time instead)';
