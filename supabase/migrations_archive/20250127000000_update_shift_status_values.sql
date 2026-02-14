-- Update shift_requests status values to include 'confirmed'
ALTER TABLE shift_requests 
DROP CONSTRAINT IF EXISTS shift_requests_status_check;

ALTER TABLE shift_requests 
ADD CONSTRAINT shift_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'confirmed'));

-- Update shift_postings status values to include 'confirmed'
ALTER TABLE shift_postings
DROP CONSTRAINT IF EXISTS shift_postings_status_check;

-- Update any existing invalid status values to 'open'
UPDATE shift_postings
SET status = 'open'
WHERE status NOT IN ('open', 'filled', 'cancelled', 'confirmed');

ALTER TABLE shift_postings
ADD CONSTRAINT shift_postings_status_check
CHECK (status IN ('open', 'filled', 'cancelled', 'confirmed'));

-- Add comments to document the new status values
COMMENT ON COLUMN shift_requests.status IS 'Status: pending, approved, rejected, confirmed';
COMMENT ON COLUMN shift_postings.status IS 'Status: open, filled, cancelled, confirmed';
