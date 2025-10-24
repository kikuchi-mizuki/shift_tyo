-- 認証データとプロフィールデータの確認クエリ
-- SupabaseのSQL Editorで実行してください

-- 1. 認証ユーザー（auth.users）の確認
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_auth_users,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_emails
FROM auth.users;

-- 2. 認証ユーザーの詳細情報
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 3. プロフィールデータ（user_profiles）の確認
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN name IS NULL OR name = '' OR name LIKE '%未設定%' THEN 1 END) as invalid_names,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails
FROM user_profiles;

-- 4. 認証データとプロフィールデータの関連性確認
SELECT 
  'auth_users_without_profile' as data_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 5. プロフィールデータと認証データの関連性確認
SELECT 
  'profiles_without_auth' as data_type,
  COUNT(*) as count
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- 6. 重複するメールアドレスの確認
SELECT 
  email,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as auth_user_ids
FROM auth.users
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1;

-- 7. 無効な認証ユーザーの詳細
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email IS NULL 
   OR email = ''
   OR email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 8. 古い認証データの確認（例：30日以上ログインしていない）
SELECT 
  'inactive_auth_users' as data_type,
  COUNT(*) as count
FROM auth.users
WHERE last_sign_in_at IS NULL 
   OR last_sign_in_at < NOW() - INTERVAL '30 days';

-- 9. 認証データとプロフィールデータの整合性確認
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  up.name as profile_name,
  up.email as profile_email,
  up.user_type,
  CASE 
    WHEN up.id IS NULL THEN '認証データのみ'
    WHEN au.id IS NULL THEN 'プロフィールデータのみ'
    ELSE '両方存在'
  END as data_status
FROM auth.users au
FULL OUTER JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;
