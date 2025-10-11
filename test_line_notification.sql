-- 手動でLINE通知をテストするためのSQL

-- 1. 現在のユーザーのLINE連携状況を確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE id = auth.uid();

-- 2. 手動でLINE通知を送信する（テスト用）
-- 注意: 実際のユーザーIDに置き換えてください
/*
SELECT net.http_post(
  url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
  ),
  body := jsonb_build_object(
    'userId', 'YOUR_USER_ID_HERE', -- 実際のユーザーIDに置き換え
    'message', 'テスト通知です。シフト確定の通知が正常に動作するかテストしています。',
    'notificationType', 'shift_confirmed',
    'metadata', jsonb_build_object(
      'shiftDate', '2025-01-15',
      'timeSlot', 'morning',
      'storeName', 'テスト店舗'
    )
  )
);
*/

-- 3. LINE通知ログの最新20件を確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.message,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.user_type
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
ORDER BY lnl.sent_at DESC
LIMIT 20;

-- 4. 通知の成功率を確認
SELECT 
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM line_notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_type;

-- 5. 最近の失敗した通知の詳細を確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.line_user_id,
  up.line_notification_enabled
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.status = 'failed'
  AND lnl.sent_at >= NOW() - INTERVAL '7 days'
ORDER BY lnl.sent_at DESC;
