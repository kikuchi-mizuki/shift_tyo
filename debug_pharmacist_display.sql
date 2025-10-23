-- 薬剤師表示問題のデバッグ用SQLクエリ

-- 1. user_profilesテーブルの薬剤師データを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY updated_at DESC;

-- 2. v_user_profilesテーブルの薬剤師データを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM v_user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY updated_at DESC;

-- 3. app_usersテーブルの薬剤師データを確認
SELECT 
  id,
  email,
  created_at,
  updated_at
FROM app_users 
WHERE id IN (
  SELECT id FROM user_profiles WHERE user_type = 'pharmacist'
)
ORDER BY updated_at DESC;

-- 4. 薬剤師のシフト希望データを確認
SELECT 
  sr.id,
  sr.pharmacist_id,
  sr.date,
  sr.time_slot,
  sr.memo,
  up.name as pharmacist_name,
  up.email as pharmacist_email
FROM shift_requests sr
LEFT JOIN user_profiles up ON sr.pharmacist_id = up.id
WHERE up.user_type = 'pharmacist'
ORDER BY sr.date DESC, sr.created_at DESC;

-- 5. 薬剤師の確定シフトデータを確認
SELECT 
  as_shift.id,
  as_shift.pharmacist_id,
  as_shift.pharmacy_id,
  as_shift.date,
  as_shift.time_slot,
  up_pharmacist.name as pharmacist_name,
  up_pharmacy.name as pharmacy_name
FROM assigned_shifts as_shift
LEFT JOIN user_profiles up_pharmacist ON as_shift.pharmacist_id = up_pharmacist.id
LEFT JOIN user_profiles up_pharmacy ON as_shift.pharmacy_id = up_pharmacy.id
WHERE up_pharmacist.user_type = 'pharmacist'
ORDER BY as_shift.date DESC, as_shift.created_at DESC;
