-- 薬剤師データのデバッグ用SQLクエリ

-- 1. user_profilesテーブルから薬剤師のデータを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at;

-- 2. v_user_profilesテーブルから薬剤師のデータを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM v_user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at;

-- 3. app_usersテーブルから薬剤師のデータを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM app_users 
WHERE user_type = 'pharmacist'
ORDER BY created_at;

-- 4. 全テーブルから薬剤師関連のデータを確認
SELECT 'user_profiles' as table_name, id, name, email, user_type, created_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
UNION ALL
SELECT 'v_user_profiles' as table_name, id, name, email, user_type, created_at
FROM v_user_profiles 
WHERE user_type = 'pharmacist'
UNION ALL
SELECT 'app_users' as table_name, id, name, email, user_type, created_at
FROM app_users 
WHERE user_type = 'pharmacist'
ORDER BY created_at;

-- 5. 薬剤師のシフト希望データを確認
SELECT 
  sr.id,
  sr.pharmacist_id,
  sr.date,
  sr.time_slot,
  up.name as pharmacist_name,
  up.email as pharmacist_email
FROM shift_requests sr
LEFT JOIN user_profiles up ON sr.pharmacist_id = up.id
WHERE up.user_type = 'pharmacist'
ORDER BY sr.date, sr.pharmacist_id;
