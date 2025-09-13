-- user_profilesテーブルにstore_names配列カラムを追加
-- 既存のstore_nameカラムからstore_names配列に移行

-- 1. store_names配列カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS store_names text[];

-- 2. 既存のstore_nameカラムからstore_names配列に移行
UPDATE user_profiles 
SET store_names = CASE 
  WHEN store_name IS NOT NULL AND store_name != '' THEN ARRAY[store_name]
  ELSE ARRAY[]::text[]
END
WHERE store_names IS NULL;

-- 3. コメントを追加
COMMENT ON COLUMN user_profiles.store_names IS '店舗名の配列（薬局が複数店舗を運営している場合）';

-- 4. 確認用クエリ
SELECT 
  id, 
  name, 
  store_name, 
  store_names,
  user_type
FROM user_profiles 
WHERE user_type = 'pharmacy'
LIMIT 5;
