-- 手動でLINE通知を送信するためのSQL

-- 1. 送信待ちの通知を確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.message,
  lnl.status,
  up.name as user_name,
  up.user_type
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.status = 'ready_for_manual_send'
ORDER BY lnl.sent_at DESC
LIMIT 10;

-- 2. 手動でEdge Functionを呼び出す（curlコマンドの例）
-- 以下のコマンドをターミナルで実行してください：
/*
curl -X POST \
  'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "a6f376c4-1081-49cc-b188-7d5ae9cc5dfa",
    "message": "【シフト確定のお知らせ】\n\n日時: 10月15日\n時間: 夕方\n店舗: テスト店舗\n\nよろしくお願いします！",
    "notificationType": "shift_confirmed"
  }'
*/

-- 3. 送信結果をログに記録（手動で実行後）
-- INSERT INTO line_notification_logs (
--   user_id,
--   line_user_id,
--   notification_type,
--   message,
--   status,
--   sent_at
-- ) VALUES (
--   'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa',
--   'U25f5df19201409c6fcdfbd76a7b46b2d',
--   'shift_confirmed',
--   '手動送信テスト',
--   'success',
--   NOW()
-- );
