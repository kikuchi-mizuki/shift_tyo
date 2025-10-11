-- 緊急シフト依頼のLINE通知失敗の詳細調査

-- 1. 最近の緊急シフト通知ログの詳細確認
SELECT '=== 最近の緊急シフト通知ログ ===' as step;
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.line_notification_enabled
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.notification_type = 'emergency'
  AND lnl.sent_at >= NOW() - INTERVAL '2 hours'
ORDER BY lnl.sent_at DESC;

-- 2. 通知キューの状況確認
SELECT '=== 通知キュー状況 ===' as step;
SELECT 
  id,
  user_id,
  notification_type,
  status,
  error_message,
  retry_count,
  created_at,
  updated_at
FROM notification_queue 
WHERE notification_type = 'emergency'
  AND created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 3. 薬剤師のLINE連携状況確認
SELECT '=== 薬剤師LINE連携状況 ===' as step;
SELECT 
  id,
  name,
  user_type,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled,
  line_linked_at,
  CASE 
    WHEN line_user_id IS NOT NULL AND line_notification_enabled THEN '✅ 通知可能'
    WHEN line_user_id IS NULL THEN '❌ LINE未連携'
    WHEN NOT line_notification_enabled THEN '❌ 通知無効'
    ELSE '❓ 不明'
  END as status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY status DESC, name;

-- 4. Edge Functionの環境変数確認（参考情報）
SELECT '=== Edge Function環境変数確認 ===' as step;
SELECT 
  '以下の環境変数がSupabase Functionsで正しく設定されているか確認してください:' as info,
  'LINE_CHANNEL_ACCESS_TOKEN' as env_var_1,
  'LINE_CHANNEL_SECRET' as env_var_2,
  'WEB_APP_URL' as env_var_3,
  'SUPABASE_URL' as env_var_4,
  'SUPABASE_ANON_KEY' as env_var_5;

-- 5. 緊急シフト依頼のテスト送信
SELECT '=== 緊急シフト依頼テスト送信 ===' as step;
-- 通知キューに緊急シフト通知を追加
INSERT INTO notification_queue (
  user_id,
  line_user_id,
  notification_type,
  message,
  priority,
  status,
  scheduled_at,
  created_at
)
SELECT 
  id,
  line_user_id,
  'emergency',
  '🧪 テスト: 緊急シフト通知システムの動作確認です。',
  1,
  'pending',
  NOW(),
  NOW()
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL 
  AND line_notification_enabled = true
LIMIT 1;

-- テスト通知を即座に処理
SELECT * FROM send_queued_notifications();

-- 6. テスト結果確認
SELECT '=== テスト結果確認 ===' as step;
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.notification_type = 'emergency'
  AND lnl.sent_at >= NOW() - INTERVAL '5 minutes'
ORDER BY lnl.sent_at DESC;
