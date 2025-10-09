-- シフト確定通知のテスト用SQL

-- 1. LINE連携済みのユーザーを確認
SELECT 
  up.id,
  up.name,
  up.user_type,
  up.line_user_id,
  up.line_notification_enabled
FROM user_profiles up
WHERE up.line_user_id IS NOT NULL
ORDER BY up.user_type, up.name;

-- 2. テスト用のシフト確定データを作成
-- 薬剤師と薬局の両方がLINE連携済みの場合のみ実行
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

-- 3. 挿入されたデータを確認
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
WHERE as.status = 'confirmed'
ORDER BY as.created_at DESC
LIMIT 5;

-- 4. LINE通知ログを確認
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
ORDER BY lnl.sent_at DESC
LIMIT 10;
