-- 管理者権限でのshift_requestsアクセス確認

-- 1. 現在のユーザー情報を確認
SELECT 
  '現在のユーザー情報' as info,
  auth.uid() as current_user_id,
  current_user as current_user,
  session_user as session_user;

-- 2. 管理者ユーザーの確認
SELECT 
  '管理者ユーザー確認' as info,
  id,
  name,
  email,
  user_type
FROM user_profiles 
WHERE user_type = 'admin';

-- 3. RLSポリシーの確認
SELECT 
  'RLSポリシー確認' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'shift_requests';

-- 4. 管理者権限でのshift_requestsアクセステスト
-- 注意: このクエリは管理者として実行する必要があります
SELECT 
  '管理者アクセステスト' as info,
  COUNT(*) as accessible_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM shift_requests;

-- 5. shift_requestsの全データ（管理者権限で実行）
SELECT 
  'shift_requests全データ' as info,
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  priority,
  created_at
FROM shift_requests 
ORDER BY date DESC, created_at DESC;

-- 6. user_profilesとshift_requestsの結合確認
SELECT 
  '薬剤師と希望データの結合' as info,
  up.name as pharmacist_name,
  up.email as pharmacist_email,
  COUNT(sr.id) as request_count,
  STRING_AGG(DISTINCT sr.date::text, ', ') as request_dates
FROM user_profiles up
LEFT JOIN shift_requests sr ON up.id = sr.pharmacist_id
WHERE up.user_type = 'pharmacist'
GROUP BY up.id, up.name, up.email
HAVING COUNT(sr.id) > 0
ORDER BY request_count DESC;
