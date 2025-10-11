-- 緊急シフト依頼失敗の詳細調査

-- 1. 薬剤師のLINE連携状況を詳細確認
SELECT '=== 薬剤師のLINE連携状況詳細 ===' as step;
SELECT 
  id,
  name,
  email,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- 2. LINE連携済みで通知有効な薬剤師のみ
SELECT '=== 通知可能な薬剤師 ===' as step;
SELECT 
  id,
  name,
  line_user_id IS NOT NULL as has_line_id,
  line_notification_enabled,
  CASE 
    WHEN line_user_id IS NULL THEN 'LINE未連携'
    WHEN line_notification_enabled = false THEN '通知無効'
    ELSE '通知可能'
  END as status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY status, name;

-- 3. 最近の緊急シフト通知ログ
SELECT '=== 最近の緊急シフト通知ログ ===' as step;
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
WHERE lnl.notification_type = 'emergency'
  AND lnl.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY lnl.sent_at DESC;

-- 4. 最近の通知キューの状況
SELECT '=== 最近の通知キュー状況 ===' as step;
SELECT 
  id,
  user_id,
  notification_type,
  status,
  error_message,
  retry_count,
  created_at,
  updated_at
FROM notification_queue 
WHERE notification_type = 'emergency'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 5. 薬剤師のLINE連携テスト（実際のテストユーザーで）
SELECT '=== LINE連携テスト ===' as step;
SELECT 
  id,
  name,
  'LINE連携済み: ' || (line_user_id IS NOT NULL) as line_linked,
  '通知有効: ' || line_notification_enabled as notifications_enabled,
  CASE 
    WHEN line_user_id IS NOT NULL AND line_notification_enabled THEN '✅ 通知可能'
    WHEN line_user_id IS NULL THEN '❌ LINE未連携'
    WHEN NOT line_notification_enabled THEN '❌ 通知無効'
    ELSE '❓ 不明'
  END as final_status
FROM user_profiles 
WHERE user_type = 'pharmacist'
  AND id = '8c5e766e-8945-4a2e-91ff-d24b0ac4dbd3';  -- テストユーザー
