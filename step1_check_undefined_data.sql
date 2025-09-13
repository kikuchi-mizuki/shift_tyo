-- ステップ1: 削除対象のデータを確認
SELECT 
  id,
  pharmacy_id,
  date,
  time_slot,
  store_name,
  required_staff,
  memo,
  created_at
FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%'
ORDER BY created_at DESC;
