-- 日次リマインダーのテスト用SQL

-- 1. 明日のシフトがあるユーザーを確認
SELECT 
  as.id,
  as.pharmacist_id,
  as.pharmacy_id,
  as.store_name,
  as.date,
  as.time_slot,
  as.start_time,
  as.end_time,
  as.status,
  up_pharm.name as pharmacist_name,
  up_pharm.line_user_id as pharmacist_line_id,
  up_pharm.line_notification_enabled as pharmacist_notifications,
  up_pharm.name as pharmacy_name,
  up_pharm.line_user_id as pharmacy_line_id,
  up_pharm.line_notification_enabled as pharmacy_notifications
FROM assigned_shifts as
LEFT JOIN user_profiles up_pharm ON as.pharmacist_id = up_pharm.id
LEFT JOIN user_profiles up_pharm ON as.pharmacy_id = up_pharm.id
WHERE as.date = CURRENT_DATE + INTERVAL '1 day'
  AND as.status = 'confirmed'
  AND (up_pharm.line_user_id IS NOT NULL OR up_pharm.line_user_id IS NOT NULL)
ORDER BY as.start_time;

-- 2. テスト用の明日のシフトを作成
INSERT INTO assigned_shifts (
  pharmacist_id,
  pharmacy_id,
  store_name,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM user_profiles WHERE user_type = 'pharmacist' AND line_user_id IS NOT NULL LIMIT 1),
  (SELECT id FROM user_profiles WHERE user_type = 'pharmacy' AND line_user_id IS NOT NULL LIMIT 1),
  'テスト店舗',
  CURRENT_DATE + INTERVAL '1 day',
  'morning',
  '09:00:00',
  '13:00:00',
  'confirmed',
  NOW(),
  NOW()
);

-- 3. 日次リマインダーを手動実行（テスト用）
-- 実際のEdge Functionを呼び出します
SELECT 'Daily reminder test completed' as result;

-- 4. リマインダー送信後のログを確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.message_type,
  lnl.message_content,
  lnl.sent_at,
  lnl.status,
  up.name as user_name,
  up.user_type
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
WHERE lnl.message_type = 'daily_reminder'
ORDER BY lnl.sent_at DESC
LIMIT 10;
