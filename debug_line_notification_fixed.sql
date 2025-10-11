-- LINE通知が届かない問題のデバッグ用SQL（修正版）

-- 1. 現在のユーザーのLINE連携状況を確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE id = auth.uid();

-- 2. 薬剤師のLINE連携状況を確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND line_user_id IS NOT NULL
ORDER BY name;

-- 3. 薬局のLINE連携状況を確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles 
WHERE user_type = 'pharmacy' 
  AND line_user_id IS NOT NULL
ORDER BY name;

-- 4. 最近のシフト確定データを確認（修正版）
SELECT 
  as.id,
  as.pharmacist_id,
  as.pharmacy_id,
  as.store_name,
  as.date,
  as.time_slot,
  as.status,
  as.created_at,
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
LIMIT 10;

-- 5. LINE通知ログを確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.message_type,
  lnl.message_content,
  lnl.sent_at,
  lnl.status,
  lnl.error_message,
  up.name as user_name,
  up.user_type
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
ORDER BY lnl.sent_at DESC
LIMIT 20;

-- 6. トリガー関数の存在確認
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'assigned_shifts'
  AND trigger_name = 'trigger_notify_shift_confirmed';

-- 7. 通知関数の存在確認
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_shift_confirmed';

-- 8. テスト用のシフト確定（慎重に実行）
-- 注意: このクエリは実際の通知を送信します
/*
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
*/
