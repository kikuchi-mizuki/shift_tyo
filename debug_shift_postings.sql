-- シフト募集データの詳細確認SQLクエリ

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
FROM shift_postings 
ORDER BY date DESC, created_at DESC;

-- 2. 薬局のプロフィール情報と合わせて確認
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.status,
  sp.start_time,
  sp.end_time,
  sp.required_staff,
  sp.store_name,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  up.user_type
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE up.user_type = 'pharmacy'
ORDER BY sp.date DESC, sp.created_at DESC;

-- 3. 特定の日付（例：2025-10-03）のシフト募集を確認
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.status,
  sp.start_time,
  sp.end_time,
  sp.required_staff,
  sp.store_name,
  up.name as pharmacy_name,
  up.email as pharmacy_email
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE sp.date = '2025-10-03'
  AND up.user_type = 'pharmacy'
ORDER BY sp.created_at DESC;

-- 4. 時間データの詳細確認
SELECT 
  id,
  pharmacy_id,
  date,
  start_time,
  end_time,
  time_slot,
  status
FROM shift_postings 
WHERE date = '2025-10-03'
ORDER BY created_at DESC;
