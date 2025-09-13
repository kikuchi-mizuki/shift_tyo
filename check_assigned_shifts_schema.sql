-- Check the current schema of assigned_shifts table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assigned_shifts' 
ORDER BY ordinal_position;

-- Also check if store_name column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'assigned_shifts' 
      AND column_name = 'store_name'
    ) 
    THEN 'store_name column EXISTS' 
    ELSE 'store_name column DOES NOT EXIST' 
  END as store_name_status;

-- Check if memo column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'assigned_shifts' 
      AND column_name = 'memo'
    ) 
    THEN 'memo column EXISTS' 
    ELSE 'memo column DOES NOT EXIST' 
  END as memo_status;