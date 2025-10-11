-- LINE APIの直接テスト
-- 1. 対象ユーザーのLINE User IDを確認
SELECT 
  id,
  name,
  line_user_id,
  line_notification_enabled,
  user_type
FROM user_profiles 
WHERE line_user_id IS NOT NULL 
  AND line_user_id != '' 
  AND user_type = 'pharmacist'
LIMIT 1;

-- 2. LINE APIを直接呼び出し（テスト用）
-- 注意: 実際のLINE_CHANNEL_ACCESS_TOKENが必要
SELECT net.http_post(
  url := 'https://api.line.me/v2/bot/message/push',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_LINE_CHANNEL_ACCESS_TOKEN'
  ),
  body := jsonb_build_object(
    'to', 'YOUR_LINE_USER_ID',
    'messages', jsonb_build_array(
      jsonb_build_object(
        'type', 'text',
        'text', 'テストメッセージ'
      )
    )
  )
);
