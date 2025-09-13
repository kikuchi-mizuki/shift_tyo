-- 薬局名や店舗名が未定のデータを削除するSQL

-- 1. 削除対象のデータを確認
SELECT 
  'shift_postings' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN store_name IS NULL OR store_name = '' THEN 1 END) as null_or_empty_store_name,
  COUNT(CASE WHEN store_name LIKE '%薬局未設定%' OR store_name LIKE '%未設定%' THEN 1 END) as undefined_store_name,
  COUNT(CASE WHEN store_name = 'undefined' THEN 1 END) as undefined_literal
FROM shift_postings;

-- 2. 削除対象の詳細データを確認
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

-- 3. 削除対象の件数を確認
SELECT COUNT(*) as delete_count
FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';

-- 4. 削除実行
DELETE FROM shift_postings
WHERE 
    store_name IS NULL 
    OR store_name = '' 
    OR store_name LIKE '%薬局未設定%'
    OR store_name LIKE '%未設定%'
    OR store_name = 'undefined'
    OR store_name LIKE '%undefined%';

-- 5. 削除後の確認
SELECT 
  'shift_postings' as table_name,
  COUNT(*) as remaining_count
FROM shift_postings;

-- 6. 残っている募集データの確認（店舗名別）
SELECT 
  store_name,
  COUNT(*) as count
FROM shift_postings
GROUP BY store_name
ORDER BY store_name;

-- 7. user_profilesテーブルの店舗名関連データも確認
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN store_name IS NULL OR store_name = '' THEN 1 END) as null_or_empty_store_name,
  COUNT(CASE WHEN store_names IS NULL OR array_length(store_names, 1) IS NULL THEN 1 END) as null_or_empty_store_names
FROM user_profiles
WHERE user_type = 'pharmacy';

-- 8. 薬局プロフィールの店舗名データを確認
SELECT 
  id,
  name,
  store_name,
  store_names,
  user_type
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY name;
