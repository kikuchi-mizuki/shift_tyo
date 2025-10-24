-- 無効なデータを削除するSQLクエリ
-- 注意: このクエリは元に戻せません。実行前に必ずバックアップを取ってください

-- 1. 孤立したシフト希望を削除
DELETE FROM shift_requests 
WHERE pharmacist_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
);

-- 2. 孤立したシフト募集を削除
DELETE FROM shift_postings 
WHERE pharmacy_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
);

-- 3. 孤立した確定シフトを削除
DELETE FROM assigned_shifts 
WHERE pharmacist_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
) OR pharmacy_id NOT IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacy'
);

-- 4. 無効なユーザープロフィールを削除
-- (name, email, user_typeが無効なもの)
DELETE FROM user_profiles 
WHERE name IS NULL 
   OR name = '' 
   OR name LIKE '%未設定%'
   OR email IS NULL 
   OR email = ''
   OR user_type IS NULL 
   OR user_type = '';

-- 5. 重複ユーザーを削除（最新以外を削除）
WITH duplicate_users AS (
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
  SELECT id FROM duplicate_users WHERE rn > 1
);
