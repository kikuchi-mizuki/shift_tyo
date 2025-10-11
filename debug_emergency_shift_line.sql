-- 緊急シフト依頼でLINEに送信されない理由を調査するSQL

-- 1. 薬剤師のLINE連携状況を詳細確認
SELECT 
  '薬剤師のLINE連携状況' as check_type,
  COUNT(*) as total_pharmacists,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' THEN 1 END) as with_line_id,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as notification_enabled,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' AND line_notification_enabled = true THEN 1 END) as with_line_and_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 2. 薬剤師の詳細情報（LINE連携済み）
SELECT 
  id,
  name,
  email,
  line_user_id,
  line_notification_enabled,
  user_type,
  created_at,
  updated_at,
  LENGTH(line_user_id) as line_id_length,
  CASE 
    WHEN line_user_id IS NULL THEN 'LINE User ID: NULL'
    WHEN line_user_id = '' THEN 'LINE User ID: 空文字'
    WHEN LENGTH(line_user_id) < 10 THEN 'LINE User ID: 短すぎる'
    ELSE 'LINE User ID: 正常'
  END as line_status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at DESC;

-- 3. 緊急シフト依頼で対象になる薬剤師の確認
SELECT 
  '緊急シフト対象薬剤師' as check_type,
  COUNT(*) as total_pharmacists,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' THEN 1 END) as with_line_id,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as notification_enabled,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' AND user_type = 'pharmacist' THEN 1 END) as eligible_for_emergency
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 4. 実際の薬剤師データのサンプル（LINE連携済みのみ）
SELECT 
  id,
  name,
  line_user_id,
  line_notification_enabled,
  LENGTH(line_user_id) as line_id_length,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL 
  AND line_user_id != ''
ORDER BY created_at DESC
LIMIT 5;

-- 5. LINE通知ログの確認（最近のもの）
SELECT 
  id,
  user_id,
  line_user_id,
  notification_type,
  status,
  error_message,
  created_at
FROM line_notification_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 6. 通知キューの確認
SELECT 
  id,
  pharmacist_id,
  notification_type,
  status,
  error_message,
  retry_count,
  created_at,
  sent_at
FROM notification_queue 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 7. 薬局情報の確認
SELECT 
  '薬局情報' as check_type,
  COUNT(*) as total_pharmacies,
  COUNT(CASE WHEN name = 'テスト' THEN 1 END) as test_pharmacy
FROM user_profiles 
WHERE user_type = 'pharmacy';

-- 8. テスト薬局の詳細
SELECT 
  id,
  name,
  store_names,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacy' AND name = 'テスト';
