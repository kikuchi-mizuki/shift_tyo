-- 安全な段階的認証データ削除クエリ
-- 各ステップを個別に実行して確認してください

-- ステップ1: 孤立した認証ユーザーを確認（削除前の確認）
SELECT 
  '孤立した認証ユーザー' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM auth.users 
WHERE id NOT IN (
  SELECT id FROM user_profiles
);

-- ステップ2: 孤立した認証ユーザーを削除
-- DELETE FROM auth.users 
-- WHERE id NOT IN (
--   SELECT id FROM user_profiles
-- );

-- ステップ3: 無効な認証ユーザーを確認（削除前の確認）
SELECT 
  '無効な認証ユーザー' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM auth.users 
WHERE email IS NULL 
   OR email = ''
   OR email_confirmed_at IS NULL;

-- ステップ4: 無効な認証ユーザーを削除
-- DELETE FROM auth.users 
-- WHERE email IS NULL 
--    OR email = ''
--    OR email_confirmed_at IS NULL;

-- ステップ5: 古い認証データを確認（削除前の確認）
SELECT 
  '古い認証データ（30日以上未ログイン）' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM auth.users 
WHERE last_sign_in_at IS NULL 
   OR last_sign_in_at < NOW() - INTERVAL '30 days';

-- ステップ6: 古い認証データを削除
-- DELETE FROM auth.users 
-- WHERE last_sign_in_at IS NULL 
--    OR last_sign_in_at < NOW() - INTERVAL '30 days';

-- ステップ7: 重複する認証ユーザーを確認（削除前の確認）
SELECT 
  '重複する認証ユーザー' as data_type,
  email,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM auth.users 
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1;

-- ステップ8: 重複する認証ユーザーを削除（最新以外を削除）
-- WITH duplicate_auth_users AS (
--   SELECT 
--     id,
--     email,
--     created_at,
--     ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
--   FROM auth.users 
--   WHERE email IS NOT NULL AND email != ''
-- )
-- DELETE FROM auth.users 
-- WHERE id IN (
--   SELECT id FROM duplicate_auth_users WHERE rn > 1
-- );

-- ステップ9: 孤立したプロフィールデータを確認（削除前の確認）
SELECT 
  '孤立したプロフィールデータ' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM user_profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- ステップ10: 孤立したプロフィールデータを削除
-- DELETE FROM user_profiles 
-- WHERE id NOT IN (
--   SELECT id FROM auth.users
-- );

-- ステップ11: 無効なプロフィールデータを確認（削除前の確認）
SELECT 
  '無効なプロフィールデータ' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM user_profiles 
WHERE name IS NULL 
   OR name = '' 
   OR name LIKE '%未設定%'
   OR email IS NULL 
   OR email = ''
   OR user_type IS NULL 
   OR user_type = '';

-- ステップ12: 無効なプロフィールデータを削除
-- DELETE FROM user_profiles 
-- WHERE name IS NULL 
--    OR name = '' 
--    OR name LIKE '%未設定%'
--    OR email IS NULL 
--    OR email = ''
--    OR user_type IS NULL 
--    OR user_type = '';

-- ステップ13: 重複するプロフィールデータを確認（削除前の確認）
SELECT 
  '重複するプロフィールデータ' as data_type,
  email,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM user_profiles 
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1;

-- ステップ14: 重複するプロフィールデータを削除（最新以外を削除）
-- WITH duplicate_profiles AS (
--   SELECT 
--     id,
--     email,
--     created_at,
--     ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
--   FROM user_profiles 
--   WHERE email IS NOT NULL AND email != ''
-- )
-- DELETE FROM user_profiles 
-- WHERE id IN (
--   SELECT id FROM duplicate_profiles WHERE rn > 1
-- );
