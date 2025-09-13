-- ステップ2: 削除対象の件数を確認
SELECT COUNT(*) as delete_count
FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';
