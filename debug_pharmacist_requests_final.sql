-- 薬剤師の希望表示問題の最終デバッグ

-- 1. shift_requestsテーブルの全データ（2025-10-01）
SELECT 
  '2025-10-01の全データ' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority,
  memo,
  start_time,
  end_time,
  created_at,
  updated_at
FROM shift_requests 
WHERE date = '2025-10-01'
ORDER BY created_at DESC;

-- 2. status別の件数（2025-10-01）
SELECT 
  '2025-10-01のstatus別件数' as info,
  status,
  COUNT(*) as count,
  STRING_AGG(DISTINCT time_slot, ', ') as time_slots
FROM shift_requests 
WHERE date = '2025-10-01'
GROUP BY status
ORDER BY count DESC;

-- 3. 表示されるべきデータ（フィルタ条件確認）
SELECT 
  '表示されるべきデータ' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority
FROM shift_requests 
WHERE date = '2025-10-01'
  AND time_slot != 'consult'
  AND status != 'confirmed'
ORDER BY created_at DESC;

-- 4. assigned_shiftsテーブルの確認
SELECT 
  'assigned_shifts確認' as info,
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  created_at
FROM assigned_shifts 
WHERE date = '2025-10-01'
ORDER BY created_at DESC;

-- 5. user_profilesとの結合確認
SELECT 
  '薬剤師プロフィール確認' as info,
  up.id,
  up.name,
  up.email,
  up.user_type,
  sr.date,
  sr.time_slot,
  sr.status
FROM user_profiles up
LEFT JOIN shift_requests sr ON up.id = sr.pharmacist_id AND sr.date = '2025-10-01'
WHERE up.user_type = 'pharmacist'
ORDER BY up.name, sr.date;

-- 6. 管理者権限でのアクセス確認
SELECT 
  '管理者アクセス確認' as info,
  current_user as current_user,
  auth.uid() as auth_uid,
  current_setting('role') as current_role;
