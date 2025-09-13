-- 確定シフト一覧の情報連携問題を調査するためのSQL

-- 1. assigned_shiftsテーブルの現在の構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assigned_shifts' 
ORDER BY ordinal_position;

-- 2. store_nameとmemoカラムの存在確認
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

-- 3. 現在のassigned_shiftsテーブルのデータを確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  store_name,
  memo,
  created_at
FROM assigned_shifts
ORDER BY created_at DESC
LIMIT 10;

-- 4. store_nameがNULLまたは空のレコード数を確認
SELECT 
  COUNT(*) as total_records,
  COUNT(store_name) as records_with_store_name,
  COUNT(*) - COUNT(store_name) as records_without_store_name
FROM assigned_shifts;

-- 5. memoフィールドの内容を確認
SELECT 
  id,
  date,
  store_name,
  memo,
  CASE 
    WHEN memo LIKE '%[store:%' THEN 'Contains store info in memo'
    ELSE 'No store info in memo'
  END as memo_analysis
FROM assigned_shifts
WHERE memo IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 6. ユーザープロフィールとの連携確認
SELECT 
  s.id,
  s.date,
  s.store_name,
  s.memo,
  p.name as pharmacist_name,
  ph.name as pharmacy_name
FROM assigned_shifts s
LEFT JOIN user_profiles p ON s.pharmacist_id = p.id
LEFT JOIN user_profiles ph ON s.pharmacy_id = ph.id
ORDER BY s.created_at DESC
LIMIT 5;
