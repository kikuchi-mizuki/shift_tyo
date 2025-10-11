-- 緊急シフト依頼の失敗原因を調査するSQL

-- 1. LINE連携済み薬剤師の確認
SELECT 
  'LINE連携済み薬剤師' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' THEN 1 END) as with_line_id,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as notification_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 2. 薬剤師の詳細情報
SELECT 
  id,
  name,
  email,
  line_user_id,
  line_notification_enabled,
  nearest_station_name,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at DESC;

-- 3. 通知キュー状況の確認
SELECT 
  '通知キュー状況' as check_type,
  COUNT(*) as total_queued,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_1h
FROM notification_queue;

-- 4. 最近の通知ログ
SELECT 
  id,
  pharmacist_id,
  notification_type,
  status,
  error_message,
  created_at,
  sent_at
FROM notification_queue 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 5. 薬局情報の確認
SELECT 
  '薬局情報' as check_type,
  COUNT(*) as total_pharmacies,
  COUNT(CASE WHEN name = 'テスト' THEN 1 END) as test_pharmacy
FROM user_profiles 
WHERE user_type = 'pharmacy';

-- 6. テスト薬局の詳細
SELECT 
  id,
  name,
  store_names,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacy' AND name = 'テスト';

-- 7. Edge Functionの呼び出しログ確認（可能な場合）
SELECT 
  'Edge Function呼び出し' as check_type,
  'send-emergency-shift function should be called' as note;
