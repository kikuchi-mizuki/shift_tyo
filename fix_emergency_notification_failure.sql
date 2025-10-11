-- 緊急シフト依頼送信失敗の修正スクリプト

-- 1. 現在の状況を確認
-- 通知キューの状況確認
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;

-- 2. 最近の失敗した通知の詳細確認
SELECT 
  nq.id,
  nq.user_id,
  nq.notification_type,
  nq.status,
  nq.error_message,
  nq.retry_count,
  nq.created_at,
  up.name as user_name,
  up.line_user_id,
  up.line_notification_enabled
FROM notification_queue nq
LEFT JOIN user_profiles up ON nq.user_id = up.id
WHERE nq.status = 'failed'
  AND nq.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY nq.created_at DESC
LIMIT 10;

-- 3. LINE通知ログの確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.line_user_id
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY lnl.sent_at DESC
LIMIT 10;

-- 4. 薬剤師のLINE連携状況確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL
ORDER BY name;

-- 5. 通知システムの修正
-- 失敗した通知を再処理可能な状態に戻す
UPDATE notification_queue 
SET 
  status = 'pending',
  retry_count = 0,
  error_message = NULL,
  scheduled_at = NOW(),
  updated_at = NOW()
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- 6. 手動でキューを処理
SELECT send_queued_notifications();

-- 7. 結果確認
SELECT 
  status,
  COUNT(*) as count
FROM notification_queue 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY status;
