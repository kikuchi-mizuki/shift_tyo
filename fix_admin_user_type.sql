-- 管理者ユーザーのuser_typeを確認・修正するSQL

-- 1. 現在のユーザー情報を確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at
FROM user_profiles 
WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

-- 2. 管理者ユーザーのuser_typeを'admin'に更新
UPDATE user_profiles 
SET user_type = 'admin'
WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

-- 3. 更新結果を確認
SELECT 
  id,
  name,
  email,
  user_type,
  updated_at
FROM user_profiles 
WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

-- 4. 全管理者ユーザーを確認
SELECT 
  id,
  name,
  email,
  user_type
FROM user_profiles 
WHERE user_type = 'admin';
