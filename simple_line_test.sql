-- 最も簡単なLINE設定テスト
-- 1. ユーザープロファイルの確認
SELECT 
  id,
  name,
  line_user_id,
  line_notification_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist'
LIMIT 3;

-- 2. LINE連携済みユーザーの確認
SELECT 
  COUNT(*) as total_pharmacists,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' THEN 1 END) as linked_users
FROM user_profiles 
WHERE user_type = 'pharmacist';
