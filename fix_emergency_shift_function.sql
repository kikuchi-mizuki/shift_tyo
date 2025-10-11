-- 緊急シフト依頼Edge Functionの修正

-- 1. 薬剤師のLINE連携状況を修正（テストユーザー）
-- テストユーザーの通知設定を有効にする
UPDATE user_profiles 
SET 
  line_notification_enabled = true,
  updated_at = NOW()
WHERE user_type = 'pharmacist'
  AND id = '8c5e766e-8945-4a2e-91ff-d24b0ac4dbd3';

-- 2. 薬剤師のLINE連携状況確認
SELECT '=== 修正後の薬剤師LINE連携状況 ===' as step;
SELECT 
  id,
  name,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled,
  CASE 
    WHEN line_user_id IS NOT NULL AND line_notification_enabled THEN '✅ 通知可能'
    WHEN line_user_id IS NULL THEN '❌ LINE未連携'
    WHEN NOT line_notification_enabled THEN '❌ 通知無効'
    ELSE '❓ 不明'
  END as status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY status, name;

-- 3. 緊急シフト通知のテスト送信
-- 通知キューに緊急シフト通知を追加
INSERT INTO notification_queue (
  user_id,
  line_user_id,
  notification_type,
  message,
  priority,
  status,
  scheduled_at,
  created_at
)
SELECT 
  id,
  line_user_id,
  'emergency',
  '🚨 緊急シフト募集テスト 🚨

日時: 2025年1月15日 09:00-17:00
店舗: テスト店舗
状況: 急遽人手が必要になりました

ご都合がつく方はお知らせください。
詳細はアプリでご確認ください。',
  1,
  'pending',
  NOW(),
  NOW()
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL 
  AND line_notification_enabled = true;

-- 4. テスト通知を即座に処理
SELECT '=== 緊急シフト通知のテスト送信 ===' as step;
SELECT * FROM send_queued_notifications();

-- 5. 送信結果の確認
SELECT '=== 送信結果確認 ===' as step;
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.notification_type = 'emergency'
  AND lnl.sent_at >= NOW() - INTERVAL '5 minutes'
ORDER BY lnl.sent_at DESC;

-- 6. 通知キューの状況確認
SELECT '=== 通知キュー状況 ===' as step;
SELECT 
  status,
  COUNT(*) as count
FROM notification_queue 
WHERE notification_type = 'emergency'
  AND created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY status
ORDER BY status;
