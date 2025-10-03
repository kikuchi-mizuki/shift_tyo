-- 希望シフトと募集シフトのデータを確認するSQL

-- 1. 希望シフトのデータを確認
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

-- 2. 募集シフトのデータを確認
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

-- 3. 日付と時間スロットの組み合わせを確認
SELECT 
  'shift_requests' as table_name,
  date,
  time_slot,
  COUNT(*) as count
FROM shift_requests 
GROUP BY date, time_slot
UNION ALL
SELECT 
  'shift_postings' as table_name,
  date,
  time_slot,
  COUNT(*) as count
FROM shift_postings 
GROUP BY date, time_slot
ORDER BY date, time_slot, table_name;

-- 4. マッチング可能な日付・時間スロットの組み合わせを確認
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

-- 5. 薬剤師と薬局のIDを確認
SELECT 
  'pharmacist' as user_type,
  id,
  name,
  nearest_station_name
FROM user_profiles 
WHERE user_type = 'pharmacist'
UNION ALL
SELECT 
  'pharmacy' as user_type,
  id,
  name,
  nearest_station_name
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY user_type, name;
