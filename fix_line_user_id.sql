-- 無効なLINE User IDを正しいものに更新

-- 1. 現在のLINE User IDを確認
SELECT 
  id,
  name,
  user_type,
  line_user_id
FROM user_profiles 
WHERE id = 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa';

-- 2. 無効なLINE User IDを正しいものに更新
UPDATE user_profiles 
SET 
  line_user_id = 'U6a99e85de7d2922e21b6769f9c98fd5b',
  line_linked_at = NOW(),
  line_notification_enabled = true,
  updated_at = NOW()
WHERE id = 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa';

-- 3. 更新結果を確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_linked_at,
  line_notification_enabled
FROM user_profiles 
WHERE id = 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa';
