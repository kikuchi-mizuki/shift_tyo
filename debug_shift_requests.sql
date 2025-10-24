-- 薬剤師のシフト希望データを確認するSQLクエリ

-- 1. 全シフト希望データを確認
SELECT 
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  start_time,
  end_time,
  memo,
  created_at
FROM shift_requests 
ORDER BY date DESC, created_at DESC;

-- 2. 薬剤師のプロフィール情報と合わせて確認
SELECT 
  sr.id,
  sr.pharmacist_id,
  sr.date,
  sr.time_slot,
  sr.status,
  sr.start_time,
  sr.end_time,
  up.name as pharmacist_name,
  up.email as pharmacist_email,
  up.user_type
FROM shift_requests sr
LEFT JOIN user_profiles up ON sr.pharmacist_id = up.id
WHERE up.user_type = 'pharmacist'
ORDER BY sr.date DESC, sr.created_at DESC;

-- 3. 特定の日付（例：2025-10-01）のシフト希望を確認
SELECT 
  sr.id,
  sr.pharmacist_id,
  sr.date,
  sr.time_slot,
  sr.status,
  sr.start_time,
  sr.end_time,
  up.name as pharmacist_name,
  up.email as pharmacist_email
FROM shift_requests sr
LEFT JOIN user_profiles up ON sr.pharmacist_id = up.id
WHERE sr.date = '2025-10-01'
  AND up.user_type = 'pharmacist'
ORDER BY sr.created_at DESC;
