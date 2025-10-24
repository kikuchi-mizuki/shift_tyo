-- マッチング状況のデバッグ用SQLクエリ
-- 特定の日付（例：2025-10-01）のマッチング状況を確認

-- 1. 該当日のシフト希望を確認
SELECT 
  'shift_requests' as table_name,
  id,
  pharmacist_id,
  date,
  start_time,
  end_time,
  priority,
  created_at
FROM shift_requests 
WHERE date = '2025-10-03'
ORDER BY created_at DESC;

-- 2. 該当日のシフト募集を確認
SELECT 
  'shift_postings' as table_name,
  id,
  pharmacy_id,
  date,
  start_time,
  end_time,
  required_staff,
  store_name,
  status,
  created_at
FROM shift_postings 
WHERE date = '2025-10-03'
ORDER BY created_at DESC;

-- 3. 該当日の確定シフトを確認
SELECT 
  'assigned_shifts' as table_name,
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  start_time,
  end_time,
  status,
  created_at
FROM assigned_shifts 
WHERE date = '2025-10-03'
ORDER BY created_at DESC;

-- 4. 薬剤師プロフィールの確認
SELECT 
  'pharmacist_profiles' as table_name,
  id,
  name,
  email,
  user_type,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at DESC;

-- 5. 薬局プロフィールの確認
SELECT 
  'pharmacy_profiles' as table_name,
  id,
  name,
  email,
  user_type,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY created_at DESC;

-- 6. 時間帯の重複チェック
SELECT 
  'time_overlap_check' as analysis,
  r.pharmacist_id,
  r.start_time as request_start,
  r.end_time as request_end,
  p.pharmacy_id,
  p.start_time as posting_start,
  p.end_time as posting_end,
  p.required_staff,
  CASE 
    WHEN r.start_time <= p.start_time AND r.end_time >= p.end_time THEN '完全適合'
    WHEN r.start_time <= p.start_time AND r.end_time >= p.start_time THEN '部分適合（開始）'
    WHEN r.start_time <= p.end_time AND r.end_time >= p.end_time THEN '部分適合（終了）'
    WHEN r.start_time >= p.start_time AND r.end_time <= p.end_time THEN '完全包含'
    ELSE '不適合'
  END as compatibility
FROM shift_requests r
CROSS JOIN shift_postings p
WHERE r.date = '2025-10-01' 
  AND p.date = '2025-10-01'
ORDER BY compatibility DESC, r.pharmacist_id, p.pharmacy_id;

-- 7. 既存の確定シフトとの重複チェック
SELECT 
  'existing_conflicts' as analysis,
  r.pharmacist_id,
  r.date,
  r.start_time as request_start,
  r.end_time as request_end,
  a.id as assigned_shift_id,
  a.pharmacy_id as assigned_pharmacy,
  a.start_time as assigned_start,
  a.end_time as assigned_end,
  CASE 
    WHEN a.id IS NOT NULL THEN '既に確定済み'
    ELSE '未確定'
  END as status
FROM shift_requests r
LEFT JOIN assigned_shifts a ON r.pharmacist_id = a.pharmacist_id 
  AND r.date = a.date
  AND r.start_time = a.start_time
  AND r.end_time = a.end_time
WHERE r.date = '2025-10-01'
ORDER BY r.pharmacist_id;
