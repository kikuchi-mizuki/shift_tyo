-- 緊急シフト送信の直接テスト
-- 1. 対象ユーザーの確認
SELECT 
  id,
  name,
  line_user_id,
  line_notification_enabled,
  user_type
FROM user_profiles 
WHERE line_user_id IS NOT NULL 
  AND line_user_id != '' 
  AND user_type = 'pharmacist'
LIMIT 5;

-- 2. Edge Functionを直接呼び出し
SELECT net.http_post(
  url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-emergency-shift',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
  ),
  body := jsonb_build_object(
    'targetType', 'all',
    'date', '2025-01-15',
    'timeSlot', 'fullday',
    'storeName', 'テスト(本店)',
    'pharmacyName', 'テスト',
    'hourlyRate', 1500,
    'memo', '緊急シフト募集テスト'
  )
);

-- 3. LINE通知送信の直接テスト（特定ユーザー）
WITH target_user AS (
  SELECT id, name, line_user_id 
  FROM user_profiles 
  WHERE line_user_id IS NOT NULL 
    AND line_user_id != '' 
    AND user_type = 'pharmacist'
  LIMIT 1
)
SELECT net.http_post(
  url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
  ),
  body := jsonb_build_object(
    'userId', (SELECT id FROM target_user),
    'message', '【緊急シフト募集】\n\n日付: 2025-01-15\n時間帯: 終日\n店舗: テスト(本店)\n薬局: テスト\n時給: 1,500円\n\n詳細・応募はこちら:\nhttps://shifttyo-production.up.railway.app\n\nお早めにご確認ください！',
    'notificationType', 'emergency'
  )
);
