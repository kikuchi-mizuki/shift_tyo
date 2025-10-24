-- データベースの現在の状況を確認するクエリ
-- SupabaseのSQL Editorで実行してください

-- 1. ユーザープロフィールの基本情報
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN name IS NULL OR name = '' OR name LIKE '%未設定%' THEN 1 END) as invalid_names,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails,
  COUNT(CASE WHEN user_type IS NULL OR user_type = '' THEN 1 END) as invalid_types
FROM user_profiles;

-- 2. ユーザータイプ別の分布
SELECT 
  user_type,
  COUNT(*) as count,
  COUNT(CASE WHEN name IS NULL OR name = '' OR name LIKE '%未設定%' THEN 1 END) as invalid_names
FROM user_profiles 
GROUP BY user_type
ORDER BY user_type;

-- 3. 孤立したシフト希望の確認
SELECT 
  'shift_requests' as table_name,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN pharmacist_id NOT IN (SELECT id FROM user_profiles WHERE user_type = 'pharmacist') THEN 1 END) as orphaned_requests
FROM shift_requests;

-- 4. 孤立したシフト募集の確認
SELECT 
  'shift_postings' as table_name,
  COUNT(*) as total_postings,
  COUNT(CASE WHEN pharmacy_id NOT IN (SELECT id FROM user_profiles WHERE user_type = 'pharmacy') THEN 1 END) as orphaned_postings
FROM shift_postings;

-- 5. 孤立した確定シフトの確認
SELECT 
  'assigned_shifts' as table_name,
  COUNT(*) as total_assigned,
  COUNT(CASE WHEN pharmacist_id NOT IN (SELECT id FROM user_profiles WHERE user_type = 'pharmacist') THEN 1 END) as orphaned_pharmacist,
  COUNT(CASE WHEN pharmacy_id NOT IN (SELECT id FROM user_profiles WHERE user_type = 'pharmacy') THEN 1 END) as orphaned_pharmacy
FROM assigned_shifts;

-- 6. 重複データの確認
SELECT 
  email,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as user_ids
FROM user_profiles 
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1;

-- 7. 無効なユーザープロフィールの詳細
SELECT 
  id,
  name,
  email,
  user_type,
  created_at
FROM user_profiles 
WHERE name IS NULL 
   OR name = '' 
   OR name LIKE '%未設定%'
   OR email IS NULL 
   OR email = ''
   OR user_type IS NULL 
   OR user_type = ''
ORDER BY created_at DESC;
