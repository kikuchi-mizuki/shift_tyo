-- user_profilesテーブルの店舗名データを確認
SELECT
  id,
  name,
  email,
  user_type,
  store_name,
  store_names,
  CASE
    WHEN store_names IS NULL THEN 'NULL'
    WHEN array_length(store_names, 1) IS NULL THEN 'EMPTY ARRAY'
    ELSE 'HAS DATA: ' || array_to_string(store_names, ', ')
  END as store_names_status
FROM user_profiles
WHERE user_type = 'pharmacy'
ORDER BY created_at DESC;
