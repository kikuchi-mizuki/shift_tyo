-- フロントエンド緊急シフト依頼の問題を特定

-- 1. Edge Functionが参照する薬剤師の条件を詳細確認
SELECT '=== Edge Function対象薬剤師詳細確認 ===' as step;
SELECT 
  id,
  name,
  user_type,
  line_user_id IS NOT NULL as has_line_id,
  line_notification_enabled,
  -- Edge Functionの条件をチェック
  CASE 
    WHEN user_type = 'pharmacist' 
         AND line_notification_enabled = true 
         AND line_user_id IS NOT NULL THEN '✅ 対象'
    ELSE '❌ 対象外'
  END as edge_function_target,
  -- 理由を詳細表示
  CASE 
    WHEN user_type != 'pharmacist' THEN 'user_type != pharmacist'
    WHEN NOT line_notification_enabled THEN 'line_notification_enabled = false'
    WHEN line_user_id IS NULL THEN 'line_user_id IS NULL'
    ELSE '条件に一致'
  END as reason
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY edge_function_target DESC, name;

-- 2. 最近のLINE通知ログの詳細確認
SELECT '=== 最近のLINE通知ログ詳細 ===' as step;
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.line_notification_enabled
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.notification_type = 'emergency'
  AND lnl.sent_at >= NOW() - INTERVAL '2 hours'
ORDER BY lnl.sent_at DESC;

-- 3. 通知キューの詳細状況（失敗したものも含む）
SELECT '=== 通知キュー詳細状況 ===' as step;
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
  AND created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 4. フロントエンドの問題診断
SELECT '=== フロントエンド問題診断 ===' as step;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM line_notification_logs 
      WHERE notification_type = 'emergency'
        AND status = 'success'
        AND sent_at >= NOW() - INTERVAL '2 hours'
    ) THEN '✅ データベース側は正常動作中'
    ELSE '❌ データベース側に問題あり'
  END as database_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_type = 'pharmacist'
        AND line_notification_enabled = true
        AND line_user_id IS NOT NULL
    ) THEN '✅ 通知可能な薬剤師が存在'
    ELSE '❌ 通知可能な薬剤師がいない'
  END as pharmacist_status,
  
  'フロントエンドの緊急シフト依頼フォームで「失敗: 1件」が表示される問題は、Edge Functionのレスポンス処理またはフロントエンドのエラーハンドリングに原因がある可能性が高い' as diagnosis;
