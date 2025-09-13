-- Add store_name column to assigned_shifts table
-- This allows storing the specific store name for each assigned shift

-- Add store_name column
ALTER TABLE assigned_shifts 
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Add memo column for additional information
ALTER TABLE assigned_shifts 
ADD COLUMN IF NOT EXISTS memo TEXT;

-- Create index for better performance when filtering by store_name
CREATE INDEX IF NOT EXISTS idx_assigned_shifts_store_name 
ON assigned_shifts(store_name);

-- Add comment to document the purpose
COMMENT ON COLUMN assigned_shifts.store_name IS 'Store name for the specific shift assignment';
COMMENT ON COLUMN assigned_shifts.memo IS 'Additional memo information for the shift assignment';
