-- テスト用のシフトデータを作成するSQL

-- 1. 現在のシフトデータを確認
SELECT 'shift_requests' as table_name, COUNT(*) as count FROM shift_requests
UNION ALL
SELECT 'shift_postings' as table_name, COUNT(*) as count FROM shift_postings;

-- 2. 希望シフトのデータを確認
SELECT 
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at
FROM shift_requests 
ORDER BY date, time_slot;

-- 3. 募集シフトのデータを確認
SELECT 
  id,
  pharmacy_id,
  store_name,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at
FROM shift_postings 
ORDER BY date, time_slot;

-- 4. テスト用の希望シフトを作成（薬剤師1）
INSERT INTO shift_requests (
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  priority,
  created_at,
  updated_at
) VALUES (
  'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa', -- 薬剤師ID（渋谷駅）
  '2025-10-15',
  'morning',
  '09:00:00',
  '13:00:00',
  'pending',
  'high',
  NOW(),
  NOW()
);

-- 5. テスト用の募集シフトを作成（薬局1）
INSERT INTO shift_postings (
  pharmacy_id,
  store_name,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at,
  updated_at
) VALUES (
  '2dfd7305-02c0-417c-a167-bdcecf2c87e9', -- 薬局ID（新宿駅）
  'テスト店舗',
  '2025-10-15',
  'morning',
  '09:00:00',
  '13:00:00',
  'open',
  NOW(),
  NOW()
);

-- 6. 追加後のデータを確認
SELECT 'shift_requests' as table_name, COUNT(*) as count FROM shift_requests
UNION ALL
SELECT 'shift_postings' as table_name, COUNT(*) as count FROM shift_postings;

-- 7. マッチング可能な組み合わせを確認
SELECT 
  sr.date,
  sr.time_slot,
  COUNT(DISTINCT sr.id) as request_count,
  COUNT(DISTINCT sp.id) as posting_count
FROM shift_requests sr
LEFT JOIN shift_postings sp ON sr.date = sp.date AND sr.time_slot = sp.time_slot
GROUP BY sr.date, sr.time_slot
HAVING COUNT(DISTINCT sr.id) > 0 AND COUNT(DISTINCT sp.id) > 0
ORDER BY sr.date, sr.time_slot;
