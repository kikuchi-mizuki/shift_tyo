-- ステップ3: 削除実行
DELETE FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';
