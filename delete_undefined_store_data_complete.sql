-- 薬局名や店舗名が未定のデータを削除する完全なSQL

-- 1. 削除対象のデータを確認
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

-- 2. 削除対象の件数を確認
SELECT COUNT(*) as delete_count
FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';

-- 3. 削除実行
DELETE FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';

-- 4. 削除後の確認
SELECT COUNT(*) as remaining_count
FROM shift_postings;

-- 5. 残っている募集データの確認（店舗名別）
SELECT 
  store_name,
  COUNT(*) as count
FROM shift_postings
GROUP BY store_name
ORDER BY store_name;