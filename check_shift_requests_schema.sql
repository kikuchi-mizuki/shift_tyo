-- shift_requestsテーブルの構造を確認するSQL

-- 1. shift_requestsテーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'shift_requests' 
ORDER BY ordinal_position;

-- 2. shift_postingsテーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'shift_postings' 
ORDER BY ordinal_position;

-- 3. 既存のshift_requestsデータを確認
SELECT * FROM shift_requests LIMIT 5;

-- 4. 既存のshift_postingsデータを確認
SELECT * FROM shift_postings LIMIT 5;
