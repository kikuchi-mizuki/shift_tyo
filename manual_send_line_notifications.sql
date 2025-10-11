-- 手動でLINE通知を送信するSQL

-- 1. 送信待ちの通知を確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.message,
  lnl.status,
  lnl.sent_at,
  up.name as user_name
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.status = 'ready_to_send'
  AND lnl.notification_type = 'shift_confirmed'
ORDER BY lnl.sent_at DESC;

-- 2. 手動でLINE通知を送信（curlコマンドの例）
-- 注意: 実際のユーザーIDとメッセージに置き換えてください
/*
curl -X POST \
  'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "message": "【シフト確定のお知らせ】\n\n日時: 10月11日\n時間: 午前\n店舗: 新宿\n\nよろしくお願いします！",
    "notificationType": "shift_confirmed"
  }';
*/

-- 3. 送信済みの通知を確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.notification_type = 'shift_confirmed'
ORDER BY lnl.sent_at DESC
LIMIT 10;
