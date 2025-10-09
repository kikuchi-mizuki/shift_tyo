-- テスト用の薬剤師LINE連携データを作成するSQL

-- 1. 既存の薬剤師にLINE連携情報を追加（テスト用）
UPDATE user_profiles 
SET 
  line_user_id = 'U' || substr(md5(random()::text), 1, 32),
  line_notification_enabled = true,
  line_linked_at = NOW()
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NULL
LIMIT 3;

-- 2. 更新結果を確認
SELECT 
  name,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL
ORDER BY line_linked_at DESC;

-- 3. 全薬剤師のLINE連携状況を再確認
SELECT 
  COUNT(*) as total_pharmacists,
  COUNT(line_user_id) as line_linked_count,
  COUNT(CASE WHEN line_notification_enabled = true THEN 1 END) as notification_enabled_count
FROM user_profiles 
WHERE user_type = 'pharmacist';
