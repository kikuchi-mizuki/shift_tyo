-- 店舗名の更新をテストするSQL
-- 実際のユーザーIDに置き換えて実行してください

-- 1. 現在のuser_profilesデータを確認
SELECT 
  id, 
  name, 
  user_type,
  store_name,
  store_names,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY created_at DESC
LIMIT 5;

-- 2. テスト用の店舗名を追加（実際のユーザーIDに置き換えてください）
-- UPDATE user_profiles 
-- SET store_names = ARRAY['テスト店舗1', 'テスト店舗2']
-- WHERE id = 'your-actual-user-id-here';

-- 3. 更新結果を確認
-- SELECT 
--   id, 
--   name, 
--   store_names,
--   updated_at
-- FROM user_profiles 
-- WHERE id = 'your-actual-user-id-here';
