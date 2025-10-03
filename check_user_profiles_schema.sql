-- user_profilesテーブルの構造を確認するSQL

-- 1. user_profilesテーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. user_profilesテーブルのデータを確認（カラム名を特定）
SELECT * FROM user_profiles LIMIT 5;

-- 3. 薬剤師のプロフィールを確認
SELECT * FROM user_profiles WHERE user_type = 'pharmacist' LIMIT 5;
