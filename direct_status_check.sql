-- direct_status_check.sql
-- 直接データベースで問題を特定する

-- 1. 9月1日の確定シフトを確認
SELECT 
  'assigned_shifts' as table_name,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  store_name
FROM assigned_shifts 
WHERE date = '2025-09-01' 
  AND status = 'confirmed'
ORDER BY created_at;

-- 2. 9月1日のshift_postingsの状況を確認
SELECT 
  'shift_postings' as table_name,
  id,
  pharmacy_id,
  date,
  time_slot,
  status,
  store_name,
  created_at
FROM shift_postings 
WHERE date = '2025-09-01'
ORDER BY created_at;

-- 3. 9月1日のshift_requestsの状況を確認
SELECT 
  'shift_requests' as table_name,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  created_at
FROM shift_requests 
WHERE date = '2025-09-01'
ORDER BY created_at;

-- 4. フラワー薬局のIDを確認
SELECT id, name, user_type 
FROM user_profiles 
WHERE name LIKE '%フラワー%' 
   OR name LIKE '%Flower%'
   OR user_type = 'pharmacy';

-- 5. 手動でshift_postingsのステータスを更新してみる
-- （フラワー薬局のIDを上記で確認した値に置き換える）
UPDATE shift_postings 
SET status = 'confirmed' 
WHERE pharmacy_id = 'a9bf28da-163d-4bdb-ab1a-61f1856087f6'  -- フラワー薬局のID
  AND date = '2025-09-01';

-- 6. 更新結果を確認
SELECT 
  id,
  pharmacy_id,
  date,
  time_slot,
  status,
  store_name
FROM shift_postings 
WHERE pharmacy_id = 'a9bf28da-163d-4bdb-ab1a-61f1856087f6'  -- フラワー薬局のID
  AND date = '2025-09-01';
