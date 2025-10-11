-- 修正後のシフト確定自動通知をテスト

-- 1. シフト確定をテスト
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
  'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa',  -- 修正された薬剤師
  '2dfd7305-02c0-417c-a167-bdcecf2c87e9',  -- 薬局
  'テスト店舗',
  CURRENT_DATE + INTERVAL '5 days',  -- 5日後
  'morning',  -- 午前
  '09:00:00',
  '13:00:00',
  'confirmed',
  NOW(),
  NOW()
);

-- 2. 通知ログを確認
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
LIMIT 10;

-- 3. 最新のシフト確定データを確認
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
LIMIT 5;
