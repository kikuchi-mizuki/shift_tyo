-- 段階的な修正スクリプト（安全版）

-- Step 1: 現在の状況確認
SELECT '=== 現在の通知システム状況 ===' as step;
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;

-- Step 2: 失敗した通知を手動で再処理可能な状態に戻す
SELECT '=== 失敗した通知を再処理可能な状態に戻す ===' as step;
UPDATE notification_queue 
SET 
  status = 'pending',
  retry_count = 0,
  error_message = NULL,
  scheduled_at = NOW(),
  updated_at = NOW()
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- Step 3: 更新された通知数を確認
SELECT '=== 更新された通知数 ===' as step;
SELECT 
  status,
  COUNT(*) as count
FROM notification_queue 
WHERE updated_at >= NOW() - INTERVAL '5 minutes'
GROUP BY status;

-- Step 4: 薬剤師のLINE連携状況確認
SELECT '=== 薬剤師のLINE連携状況 ===' as step;
SELECT 
  id,
  name,
  user_type,
  line_user_id IS NOT NULL as line_linked,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- Step 5: 最近のLINE通知ログ確認
SELECT '=== 最近のLINE通知ログ ===' as step;
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
WHERE lnl.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY lnl.sent_at DESC
LIMIT 10;

-- Step 6: 通知キューの手動処理（既存の関数を使用）
SELECT '=== 通知キューの手動処理 ===' as step;
-- 注意: 既存のsend_queued_notifications関数が存在する場合のみ実行
-- SELECT * FROM send_queued_notifications();
