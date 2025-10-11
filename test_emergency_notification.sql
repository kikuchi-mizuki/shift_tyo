-- 緊急シフト通知システムのテスト

-- 1. 現在のシステム状態を確認
SELECT '=== システム状態確認 ===' as info;
SELECT * FROM get_notification_system_status();

-- 2. 薬剤師のLINE連携状況確認
SELECT '=== 薬剤師のLINE連携状況 ===' as info;
SELECT 
  id,
  name,
  user_type,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- 3. 通知キューにテスト通知を追加
SELECT '=== テスト通知をキューに追加 ===' as info;
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
  '🧪 テスト通知: 緊急シフト通知システムの動作確認です。',
  1,
  'pending',
  NOW(),
  NOW()
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL 
  AND line_notification_enabled = true
LIMIT 1;

-- 4. キューを手動処理
SELECT '=== キューを手動処理 ===' as info;
SELECT * FROM send_queued_notifications();

-- 5. 処理後の状態確認
SELECT '=== 処理後の状態 ===' as info;
SELECT * FROM get_notification_system_status();

-- 6. 最近の通知ログ確認
SELECT '=== 最近の通知ログ ===' as info;
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
ORDER BY lnl.sent_at DESC;

-- 7. 緊急シフト通知の即座送信テスト（コメントアウト）
/*
SELECT '=== 緊急シフト通知即座送信テスト ===' as info;
SELECT * FROM send_emergency_notification_immediate(
  ARRAY['薬剤師のUUIDをここに設定'],
  '2025-01-15'::date,
  '09:00-17:00',
  'テスト店舗'
);
*/
