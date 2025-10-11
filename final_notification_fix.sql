-- 最終的な緊急シフト通知修正

-- Step 7: 既存のsend_queued_notifications関数があるかチェック
SELECT '=== 既存の通知関数の確認 ===' as step;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'send_queued_notifications'
  AND routine_schema = 'public';

-- Step 8: 通知キューの手動処理（既存関数を使用）
SELECT '=== 通知キューの手動処理実行 ===' as step;
-- 既存の関数を呼び出し
SELECT * FROM send_queued_notifications();

-- Step 9: 処理後の状況確認
SELECT '=== 処理後の通知キュー状況 ===' as step;
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;

-- Step 10: 最近のLINE通知ログ確認
SELECT '=== 処理後のLINE通知ログ ===' as step;
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
WHERE lnl.sent_at >= NOW() - INTERVAL '10 minutes'
ORDER BY lnl.sent_at DESC
LIMIT 10;

-- Step 11: 薬剤師のLINE連携状況（通知可能なユーザー）
SELECT '=== 通知可能な薬剤師 ===' as step;
SELECT 
  id,
  name,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist'
  AND line_user_id IS NOT NULL
  AND line_notification_enabled = true
ORDER BY name;

-- Step 12: 緊急シフト依頼のテスト送信（コメントアウト）
-- 以下のクエリは実際のテスト時にコメントアウトを外してください
/*
SELECT '=== 緊急シフト依頼テスト送信 ===' as step;
-- 薬剤師のUUIDを実際の値に置き換えてください
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
*/
