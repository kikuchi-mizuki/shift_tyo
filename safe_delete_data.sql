-- 安全な段階的データ削除クエリ
-- 各ステップを個別に実行して確認してください

-- ステップ1: 孤立したシフト希望を確認（削除前の確認）
SELECT 
  '孤立したシフト希望' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM shift_requests 
WHERE pharmacist_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
);

-- ステップ2: 孤立したシフト希望を削除
-- DELETE FROM shift_requests 
-- WHERE pharmacist_id NOT IN (
--   SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
-- );

-- ステップ3: 孤立したシフト募集を確認（削除前の確認）
SELECT 
  '孤立したシフト募集' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM shift_postings 
WHERE pharmacy_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
);

-- ステップ4: 孤立したシフト募集を削除
-- DELETE FROM shift_postings 
-- WHERE pharmacy_id NOT IN (
--   SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
-- );

-- ステップ5: 孤立した確定シフトを確認（削除前の確認）
SELECT 
  '孤立した確定シフト' as data_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM assigned_shifts 
WHERE pharmacist_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
) OR pharmacy_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
);

-- ステップ6: 孤立した確定シフトを削除
-- DELETE FROM assigned_shifts 
-- WHERE pharmacist_id NOT IN (
--   SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
-- ) OR pharmacy_id NOT IN (
--   SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
-- );

-- ステップ7: 無効なユーザープロフィールを確認（削除前の確認）
SELECT 
  '無効なユーザープロフィール' as data_type,
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

-- ステップ8: 無効なユーザープロフィールを削除
-- DELETE FROM user_profiles 
-- WHERE name IS NULL 
--    OR name = '' 
--    OR name LIKE '%未設定%'
--    OR email IS NULL 
--    OR email = ''
--    OR user_type IS NULL 
--    OR user_type = '';

-- ステップ9: 重複ユーザーを確認（削除前の確認）
SELECT 
  '重複ユーザー' as data_type,
  email,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM user_profiles 
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1;

-- ステップ10: 重複ユーザーを削除（最新以外を削除）
-- WITH duplicate_users AS (
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
--   SELECT id FROM duplicate_users WHERE rn > 1
-- );
