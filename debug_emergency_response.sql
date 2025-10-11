-- 緊急シフト依頼のレスポンス形式を調査

-- 1. Edge Functionのレスポンス形式を確認
-- 実際のレスポンス形式を確認するために、最近の通知ログを調査
SELECT '=== 最近の緊急シフト通知ログ ===' as step;
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

-- 3. Edge Functionの期待されるレスポンス形式
SELECT '=== Edge Functionレスポンス形式 ===' as step;
SELECT 
  'Edge Functionは以下の形式でレスポンスを返すはず:' as info,
  '{
    "success": true,
    "total": 1,
    "sent": 1,
    "skipped": 0,
    "failed": 0,
    "details": [
      {
        "userId": "user-id",
        "name": "user-name",
        "status": "sent"
      }
    ]
  }' as expected_response_format;

-- 4. 薬剤師のLINE連携状況再確認
SELECT '=== 薬剤師LINE連携状況 ===' as step;
SELECT 
  id,
  name,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled,
  CASE 
    WHEN line_user_id IS NOT NULL AND line_notification_enabled THEN '✅ 通知可能'
    WHEN line_user_id IS NULL THEN '❌ LINE未連携'
    WHEN NOT line_notification_enabled THEN '❌ 通知無効'
    ELSE '❓ 不明'
  END as status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY status DESC, name;
