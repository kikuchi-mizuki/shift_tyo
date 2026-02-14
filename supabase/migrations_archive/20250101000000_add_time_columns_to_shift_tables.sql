-- Add start_time and end_time columns to shift_requests table
ALTER TABLE shift_requests 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add start_time and end_time columns to shift_postings table
ALTER TABLE shift_postings 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add start_time and end_time columns to assigned_shifts table
ALTER TABLE assigned_shifts 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_requests_start_time ON shift_requests(start_time);
CREATE INDEX IF NOT EXISTS idx_shift_requests_end_time ON shift_requests(end_time);
CREATE INDEX IF NOT EXISTS idx_shift_postings_start_time ON shift_postings(start_time);
CREATE INDEX IF NOT EXISTS idx_shift_postings_end_time ON shift_postings(end_time);
CREATE INDEX IF NOT EXISTS idx_assigned_shifts_start_time ON assigned_shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_assigned_shifts_end_time ON assigned_shifts(end_time);

-- Add comments to document the purpose
COMMENT ON COLUMN shift_requests.start_time IS 'Start time for the shift request';
COMMENT ON COLUMN shift_requests.end_time IS 'End time for the shift request';
COMMENT ON COLUMN shift_postings.start_time IS 'Start time for the shift posting';
COMMENT ON COLUMN shift_postings.end_time IS 'End time for the shift posting';
COMMENT ON COLUMN assigned_shifts.start_time IS 'Start time for the assigned shift';
COMMENT ON COLUMN assigned_shifts.end_time IS 'End time for the assigned shift';
