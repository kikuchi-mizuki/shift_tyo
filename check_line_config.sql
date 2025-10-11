-- LINE設定の確認
-- 1. 環境変数の確認（Edge Functionで使用される）
-- 注意: 実際の値は表示されない可能性があります

-- 2. ユーザープロファイルのLINE設定確認
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN line_user_id IS NOT NULL AND line_user_id != '' THEN 1 END) as linked_users,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as enabled_users
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 3. LINE連携済みユーザーの詳細
SELECT 
  id,
  name,
  line_user_id,
  line_notification_enabled,
  created_at
FROM user_profiles 
WHERE line_user_id IS NOT NULL 
  AND line_user_id != '' 
  AND user_type = 'pharmacist'
LIMIT 5;
