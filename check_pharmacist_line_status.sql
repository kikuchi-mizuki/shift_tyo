-- 薬剤師のLINE連携状況を確認するSQL

-- 1. 全ての薬剤師のLINE連携状況
SELECT 
  id,
  name,
  email,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- 2. LINE連携済み薬剤師の数
SELECT 
  COUNT(*) as total_pharmacists,
  COUNT(line_user_id) as line_linked_count,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as notification_enabled_count
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 3. LINE連携済み薬剤師の詳細
SELECT 
  name,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL
ORDER BY line_linked_at DESC;

-- 4. LINE未連携薬剤師の詳細
SELECT 
  name,
  email,
  line_user_id,
  line_notification_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NULL
ORDER BY name;
