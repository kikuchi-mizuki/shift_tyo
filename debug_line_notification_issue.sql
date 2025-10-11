-- LINE通知が届かない問題のデバッグ用SQL

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

-- 3. 最近のシフト確定データを確認
SELECT 
  ash.id,
  ash.pharmacist_id,
  ash.pharmacy_id,
  ash.store_name,
  ash.date,
  ash.time_slot,
  ash.status,
  ash.created_at,
  up_pharm.name as pharmacist_name,
  up_pharm.line_user_id as pharmacist_line_id,
  up_pharm.line_notification_enabled as pharmacist_notifications,
  up_pharm2.name as pharmacy_name,
  up_pharm2.line_user_id as pharmacy_line_id,
  up_pharm2.line_notification_enabled as pharmacy_notifications
FROM assigned_shifts ash
LEFT JOIN user_profiles up_pharm ON ash.pharmacist_id = up_pharm.id
LEFT JOIN user_profiles up_pharm2 ON ash.pharmacy_id = up_pharm2.id
WHERE ash.status = 'confirmed'
ORDER BY ash.created_at DESC
LIMIT 10;

-- 4. LINE通知ログを確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.message,
  lnl.status,
  lnl.error_message,
  lnl.sent_at,
  up.name as user_name,
  up.user_type
FROM line_notification_logs lnl
LEFT JOIN user_profiles up ON lnl.user_id = up.id
ORDER BY lnl.sent_at DESC
LIMIT 20;

-- 5. トリガー関数の存在確認
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'assigned_shifts'
  AND trigger_name = 'trigger_notify_shift_confirmed';

-- 6. 通知関数の存在確認
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'notify_shift_confirmed';

-- 7. 最近のシフト確定でLINE通知が送信されたかチェック
SELECT 
  ash.id as shift_id,
  ash.date,
  ash.created_at as shift_created,
  lnl.sent_at as notification_sent,
  lnl.status as notification_status,
  lnl.error_message,
  up.name as pharmacist_name,
  up.line_user_id,
  up.line_notification_enabled
FROM assigned_shifts ash
LEFT JOIN user_profiles up ON ash.pharmacist_id = up.id
LEFT JOIN line_notification_logs lnl ON ash.pharmacist_id = lnl.user_id 
  AND lnl.notification_type = 'shift_confirmed'
  AND lnl.sent_at > ash.created_at
WHERE ash.status = 'confirmed'
  AND ash.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ash.created_at DESC
LIMIT 10;
