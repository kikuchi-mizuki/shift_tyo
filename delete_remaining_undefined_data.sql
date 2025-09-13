-- 残っている「薬局未設定」データを削除するSQL（詳細版）

-- 1. 現在残っている「薬局未設定」データを詳細確認
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
    OR store_name = 'undefined'
    OR store_name LIKE '%未設定%'
    OR store_name LIKE '%undefined%';

-- 2. 削除対象の件数を確認
SELECT COUNT(*) as delete_count
FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%未設定%'
    OR store_name LIKE '%undefined%';

-- 3. より広範囲な条件で「薬局未設定」データを削除
DELETE FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%未設定%'
    OR store_name LIKE '%undefined%'
    OR store_name LIKE '%薬局%' AND store_name LIKE '%未設定%';

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

-- 6. 特定の日付（9月7日）のデータを確認
SELECT 
  id,
  pharmacy_id,
  date,
  time_slot,
  store_name,
  required_staff,
  memo
FROM shift_postings
WHERE date = '2025-09-07';

