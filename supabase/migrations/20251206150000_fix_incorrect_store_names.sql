-- Fix incorrect store_names in assigned_shifts table
-- Delete pending shifts with incorrect store_names (pharmacy names instead of store names)
-- These will be recreated when AI matching is re-run

-- Delete all pending shifts (status = 'pending')
-- These are AI matching results that haven't been confirmed yet
DELETE FROM assigned_shifts
WHERE status = 'pending';

-- Add comment
COMMENT ON TABLE assigned_shifts IS
'Shift assignments table. Pending shifts with incorrect store_names have been cleaned up on 2025-12-06.';
