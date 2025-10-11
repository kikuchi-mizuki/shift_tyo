-- 緊急シフト依頼の実際のテスト送信

-- Step 1: テスト通知をキューに追加
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
  AND line_notification_enabled = true
LIMIT 1;

-- Step 2: テスト通知を即座に処理
SELECT '=== 緊急シフト通知の送信結果 ===' as step;
SELECT * FROM send_queued_notifications();

-- Step 3: 送信後の状況確認
SELECT '=== 送信後の通知キュー状況 ===' as step;
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY status
ORDER BY status;

-- Step 4: 最近のLINE通知ログ確認
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
WHERE lnl.sent_at >= NOW() - INTERVAL '5 minutes'
ORDER BY lnl.sent_at DESC
LIMIT 5;

-- Step 5: 成功確認
SELECT '=== 修正完了確認 ===' as step;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM line_notification_logs 
      WHERE sent_at >= NOW() - INTERVAL '5 minutes' 
        AND status = 'success'
        AND notification_type = 'emergency'
    ) THEN '✅ 緊急シフト通知が正常に送信されました！'
    ELSE '❌ 通知送信に問題があります'
  END as result;
