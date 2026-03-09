-- Update shift_postings default status from 'recruiting' to 'open'
-- This aligns with the check constraint that only allows: 'open', 'filled', 'cancelled', 'confirmed'

-- First, update any existing rows with 'recruiting' status to 'open'
UPDATE shift_postings
SET status = 'open'
WHERE status = 'recruiting';

-- Then, alter the default value for the status column
ALTER TABLE shift_postings
ALTER COLUMN status SET DEFAULT 'open';

-- Add a comment to document the allowed status values
COMMENT ON COLUMN shift_postings.status IS 'Status: open, filled, cancelled, confirmed (default: open)';
