-- 薬局のシフト募集データを確認するSQLクエリ

-- 1. 全シフト募集データを確認
SELECT 
  id,
  pharmacy_id,
  date,
  time_slot,
  status,
  start_time,
  end_time,
  required_staff,
  store_name,
  memo,
  created_at
FROM pharmacy_needs 
ORDER BY date DESC, created_at DESC;

-- 2. 薬局のプロフィール情報と合わせて確認
SELECT 
  pn.id,
  pn.pharmacy_id,
  pn.date,
  pn.time_slot,
  pn.status,
  pn.start_time,
  pn.end_time,
  pn.required_staff,
  pn.store_name,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  up.user_type
FROM pharmacy_needs pn
LEFT JOIN user_profiles up ON pn.pharmacy_id = up.id
WHERE up.user_type = 'pharmacy'
ORDER BY pn.date DESC, pn.created_at DESC;

-- 3. 特定の日付（例：2025-10-03）のシフト募集を確認
SELECT 
  pn.id,
  pn.pharmacy_id,
  pn.date,
  pn.time_slot,
  pn.status,
  pn.start_time,
  pn.end_time,
  pn.required_staff,
  pn.store_name,
  up.name as pharmacy_name,
  up.email as pharmacy_email
FROM pharmacy_needs pn
LEFT JOIN user_profiles up ON pn.pharmacy_id = up.id
WHERE pn.date = '2025-10-03'
  AND up.user_type = 'pharmacy'
ORDER BY pn.created_at DESC;
