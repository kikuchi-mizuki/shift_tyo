-- 認証データとプロフィールデータを削除するSQLクエリ
-- 注意: このクエリは元に戻せません。実行前に必ずバックアップを取ってください

-- 1. 孤立した認証ユーザーを削除（プロフィールデータがない認証ユーザー）
DELETE FROM auth.users 
WHERE id NOT IN (
  SELECT id FROM user_profiles
);

-- 2. 無効な認証ユーザーを削除
DELETE FROM auth.users 
WHERE email IS NULL 
   OR email = ''
   OR email_confirmed_at IS NULL;

-- 3. 古い認証データを削除（30日以上ログインしていない）
DELETE FROM auth.users 
WHERE last_sign_in_at IS NULL 
   OR last_sign_in_at < NOW() - INTERVAL '30 days';

-- 4. 重複する認証ユーザーを削除（最新以外を削除）
WITH duplicate_auth_users AS (
  SELECT 
    id,
    email,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM auth.users 
  WHERE email IS NOT NULL AND email != ''
)
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM duplicate_auth_users WHERE rn > 1
);

-- 5. 孤立したプロフィールデータを削除（認証データがないプロフィール）
DELETE FROM user_profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- 6. 無効なプロフィールデータを削除
DELETE FROM user_profiles 
WHERE name IS NULL 
   OR name = '' 
   OR name LIKE '%未設定%'
   OR email IS NULL 
   OR email = ''
   OR user_type IS NULL 
   OR user_type = '';

-- 7. 重複するプロフィールデータを削除（最新以外を削除）
WITH duplicate_profiles AS (
  SELECT 
    id,
    email,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM user_profiles 
  WHERE email IS NOT NULL AND email != ''
)
DELETE FROM user_profiles 
WHERE id IN (
  SELECT id FROM duplicate_profiles WHERE rn > 1
);
