-- Delete old AI matching results with incorrect store names
-- This clears pending assignments so AI matching can be re-run with correct store names

-- Delete all pending AI matching results
DELETE FROM assigned_shifts
WHERE status = 'pending';

-- Add comment
COMMENT ON TABLE assigned_shifts IS
'Shift assignments table. Old pending AI matching results deleted on 2025-12-06 to allow re-matching with correct store names.';
