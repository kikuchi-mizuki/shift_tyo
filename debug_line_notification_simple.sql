-- LINE通知が届かない問題のデバッグ用SQL（シンプル版）

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

-- 4. 最近のシフト確定データを確認
SELECT 
  shifts.id,
  shifts.pharmacist_id,
  shifts.pharmacy_id,
  shifts.store_name,
  shifts.date,
  shifts.time_slot,
  shifts.status,
  shifts.created_at
FROM assigned_shifts shifts
WHERE shifts.status = 'confirmed'
ORDER BY shifts.created_at DESC
LIMIT 10;

-- 5. LINE通知ログを確認
SELECT 
  lnl.id,
  lnl.user_id,
  lnl.line_user_id,
  lnl.notification_type,
  lnl.message,
  lnl.status,
  lnl.error_message,
  lnl.sent_at
FROM line_notification_logs lnl
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
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'notify_shift_confirmed';
