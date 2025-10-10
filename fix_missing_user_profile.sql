-- 認証ユーザーのプロフィールを作成するSQL

-- まず、認証ユーザーがuser_profilesに存在するかチェック
SELECT 
  id, 
  email, 
  name, 
  user_type,
  created_at
FROM user_profiles 
WHERE id = '8c5e766e-8945-4a2e-91ff-d24b0ac4dbd3';

-- ユーザープロフィールが存在しない場合、作成
INSERT INTO user_profiles (
  id,
  email,
  name,
  user_type,
  created_at,
  updated_at
) VALUES (
  '8c5e766e-8945-4a2e-91ff-d24b0ac4dbd3',
  'test@test.com',  -- 実際のメールアドレスに変更してください
  'テストユーザー',  -- 実際の名前に変更してください
  'pharmacist',     -- または 'pharmacy' に変更してください
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  user_type = EXCLUDED.user_type,
  updated_at = NOW();

-- 作成後の確認
SELECT 
  id, 
  email, 
  name, 
  user_type,
  created_at
FROM user_profiles 
WHERE id = '8c5e766e-8945-4a2e-91ff-d24b0ac4dbd3';
