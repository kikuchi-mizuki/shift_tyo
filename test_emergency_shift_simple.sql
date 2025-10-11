-- 簡単な緊急シフト送信テスト
-- 1. 対象ユーザーの確認
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
LIMIT 3;
