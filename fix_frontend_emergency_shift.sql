-- フロントエンド緊急シフト依頼の問題を調査・修正

-- 1. Edge Functionの環境変数確認
SELECT '=== Edge Function環境変数確認 ===' as step;
-- 注意: 以下の環境変数がSupabase Functionsで正しく設定されているか確認
-- LINE_CHANNEL_ACCESS_TOKEN
-- LINE_CHANNEL_SECRET
-- WEB_APP_URL
-- SUPABASE_URL
-- SUPABASE_ANON_KEY
-- SUPABASE_SERVICE_ROLE_KEY

-- 2. 緊急シフト依頼のEdge Functionを直接テスト
-- このクエリは手動でEdge Functionを呼び出すための情報を提供
SELECT '=== Edge Function直接テスト用情報 ===' as step;
SELECT 
  'URL: ' || 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-emergency-shift' as endpoint,
  'Method: POST' as method,
  'Headers: Content-Type: application/json, Authorization: Bearer [ANON_KEY]' as headers,
  'Body例: {"targetType":"all","date":"2025-01-15","timeSlot":"fullday","storeName":"テスト店舗"}' as body_example;

-- 3. 薬剤師の詳細情報確認（Edge Functionが参照する条件）
SELECT '=== Edge Function対象薬剤師確認 ===' as step;
SELECT 
  id,
  name,
  user_type,
  line_user_id IS NOT NULL as has_line_id,
  line_notification_enabled,
  'targetType=all条件に一致: ' || (
    user_type = 'pharmacist' 
    AND line_notification_enabled = true 
    AND line_user_id IS NOT NULL
  ) as matches_all_condition
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY matches_all_condition DESC, name;

-- 4. 最近のEdge Function呼び出しログ（可能な範囲で）
SELECT '=== 最近の通知ログ（Edge Function経由） ===' as step;
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
  AND lnl.sent_at >= NOW() - INTERVAL '1 hour'
ORDER BY lnl.sent_at DESC;

-- 5. 通知キューの状況（Edge Functionからの直接呼び出しを確認）
SELECT '=== 通知キュー状況（Edge Function経由） ===' as step;
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue 
WHERE notification_type = 'emergency'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY status;
