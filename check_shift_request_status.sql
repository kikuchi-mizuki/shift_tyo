-- 薬剤師の希望データのstatusを確認

-- 1. shift_requestsテーブルの全カラムを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'shift_requests' 
ORDER BY ordinal_position;

-- 2. shift_requestsの全データ（status含む）
SELECT 
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority,
  memo,
  created_at,
  updated_at
FROM shift_requests 
ORDER BY date DESC, created_at DESC;

-- 3. status別の件数確認
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(DISTINCT date::text, ', ') as dates
FROM shift_requests 
GROUP BY status
ORDER BY count DESC;

-- 4. 2025-10-01のデータの詳細確認
SELECT 
  '2025-10-01のデータ' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority,
  memo
FROM shift_requests 
WHERE date = '2025-10-01';

-- 5. 表示されるべき薬剤師の希望データ（status != 'confirmed'）
SELECT 
  '表示されるべきデータ' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority,
  memo
FROM shift_requests 
WHERE status != 'confirmed' 
  AND time_slot != 'consult'
ORDER BY date DESC, created_at DESC;
