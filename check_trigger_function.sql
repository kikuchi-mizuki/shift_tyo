-- トリガー関数の詳細確認

-- 1. トリガー関数の定義を確認
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_shift_confirmed';

-- 2. トリガーの詳細情報を確認
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'assigned_shifts'
  AND trigger_name = 'trigger_notify_shift_confirmed';

-- 3. トリガー関数の権限を確認
SELECT 
  p.proname as function_name,
  p.proacl as access_privileges
FROM pg_proc p
WHERE p.proname = 'notify_shift_confirmed';

-- 4. テーブルの権限を確認
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'assigned_shifts';
