-- 全ての薬局にデフォルトの店舗名「本店」を設定
UPDATE user_profiles
SET store_names = ARRAY['本店']
WHERE user_type = 'pharmacy'
  AND (store_names IS NULL OR array_length(store_names, 1) IS NULL);

-- 確認クエリ
SELECT
  name,
  email,
  store_names,
  array_to_string(store_names, ', ') as store_names_list
FROM user_profiles
WHERE user_type = 'pharmacy'
ORDER BY created_at DESC;
