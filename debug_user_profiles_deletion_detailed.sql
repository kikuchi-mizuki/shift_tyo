-- 薬剤師データがログアウト後にuser_profilesから消える問題の詳細デバッグ用SQLクエリ

-- 1. user_profilesテーブルの現在の状態を詳細確認
SELECT 
  'CURRENT_STATE' as check_type,
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at,
  CASE 
    WHEN name IS NULL OR name = '' THEN 'NAME_EMPTY'
    WHEN name = email THEN 'NAME_IS_EMAIL'
    ELSE 'NAME_SET'
  END as name_status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY updated_at DESC;

-- 2. 最近の更新履歴を確認（updated_atでソート）
SELECT 
  'RECENT_UPDATES' as check_type,
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_since_creation
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY updated_at DESC
LIMIT 10;

-- 3. テーブルの制約とトリガーを詳細確認
SELECT 
  'TRIGGERS' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation,
  action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles'
ORDER BY trigger_name;

-- 4. RLS（Row Level Security）ポリシーを詳細確認
SELECT 
  'RLS_POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 5. テーブルの権限を詳細確認
SELECT 
  'TABLE_PRIVILEGES' as check_type,
  grantee,
  privilege_type,
  is_grantable,
  grantor
FROM information_schema.table_privileges 
WHERE table_name = 'user_profiles'
ORDER BY grantee, privilege_type;

-- 6. 外部キー制約を詳細確認
SELECT 
  'FOREIGN_KEYS' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_profiles'
ORDER BY tc.constraint_name;

-- 7. テーブルの統計情報を詳細確認
SELECT 
  'TABLE_STATS' as check_type,
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'user_profiles';

-- 8. 最近の削除操作を確認（ログが有効な場合）
SELECT 
  'AUDIT_LOG' as check_type,
  schemaname,
  tablename,
  operation,
  old_values,
  new_values,
  timestamp,
  user_name
FROM audit_log 
WHERE tablename = 'user_profiles'
  AND operation = 'DELETE'
ORDER BY timestamp DESC
LIMIT 10;

-- 9. アプリケーションログを確認（もしあれば）
SELECT 
  'APP_LOG' as check_type,
  id,
  user_id,
  action,
  table_name,
  record_id,
  created_at,
  details
FROM application_logs 
WHERE table_name = 'user_profiles'
  AND (action = 'DELETE' OR action = 'UPDATE')
ORDER BY created_at DESC
LIMIT 10;

-- 10. データベースの設定を確認
SELECT 
  'DB_CONFIG' as check_type,
  name,
  setting,
  unit,
  context,
  short_desc
FROM pg_settings 
WHERE name IN (
  'log_statement',
  'log_min_duration_statement',
  'log_line_prefix',
  'log_connections',
  'log_disconnections',
  'log_lock_waits',
  'log_temp_files',
  'log_autovacuum_min_duration',
  'autovacuum',
  'autovacuum_vacuum_threshold',
  'autovacuum_analyze_threshold'
)
ORDER BY name;
