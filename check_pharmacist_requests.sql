-- 薬剤師の希望データの確認クエリ
-- AdminDashboardで表示されない原因を特定する

-- 1. shift_requestsテーブルの全データを確認
SELECT 
  'shift_requests全データ' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status != 'confirmed' THEN 1 END) as non_confirmed_count,
  COUNT(CASE WHEN time_slot != 'consult' THEN 1 END) as non_consult_count
FROM shift_requests;

-- 2. 薬剤師の希望データの詳細（確定済み以外）
SELECT 
  '薬剤師の希望詳細' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  start_time,
  end_time,
  priority,
  memo,
  created_at
FROM shift_requests 
WHERE status != 'confirmed' 
  AND time_slot != 'consult'
ORDER BY date DESC, created_at DESC;

-- 3. 今日の日付での希望データ
SELECT 
  '今日の希望データ' as info,
  COUNT(*) as count,
  STRING_AGG(DISTINCT date::text, ', ') as dates
FROM shift_requests 
WHERE status != 'confirmed' 
  AND time_slot != 'consult'
  AND date >= CURRENT_DATE - INTERVAL '7 days';

-- 4. user_profilesテーブルとの結合確認
SELECT 
  '薬剤師プロフィール確認' as info,
  up.id,
  up.name,
  up.email,
  up.user_type,
  COUNT(sr.id) as request_count
FROM user_profiles up
LEFT JOIN shift_requests sr ON up.id = sr.pharmacist_id
WHERE up.user_type = 'pharmacist'
GROUP BY up.id, up.name, up.email, up.user_type
ORDER BY request_count DESC;

-- 5. 2025年10月の希望データ（カレンダーで表示される月）
SELECT 
  '2025年10月の希望データ' as info,
  date,
  COUNT(*) as request_count,
  STRING_AGG(DISTINCT pharmacist_id::text, ', ') as pharmacist_ids
FROM shift_requests 
WHERE status != 'confirmed' 
  AND time_slot != 'consult'
  AND date >= '2025-10-01' 
  AND date < '2025-11-01'
GROUP BY date
ORDER BY date;

-- 6. 管理者権限でのアクセス確認
SELECT 
  '管理者アクセス確認' as info,
  current_user as current_user,
  session_user as session_user,
  current_setting('role') as current_role;
