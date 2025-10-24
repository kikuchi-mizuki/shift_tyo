-- ユーザープロフィール削除問題のデバッグ用SQLクエリ

-- 1. user_profilesテーブルの現在の状態を確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at;

-- 2. 削除されたレコードの履歴を確認（もしあれば）
SELECT 
  id,
  name,
  email,
  user_type,
  created_at,
  updated_at,
  deleted_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
  AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- 3. テーブルの制約とトリガーを確認
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles';

-- 4. RLS（Row Level Security）ポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 5. テーブルの権限を確認
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_profiles';

-- 6. 最近の削除操作を確認（ログが有効な場合）
SELECT 
  schemaname,
  tablename,
  operation,
  old_values,
  new_values,
  timestamp
FROM audit_log 
WHERE tablename = 'user_profiles'
  AND operation = 'DELETE'
ORDER BY timestamp DESC
LIMIT 10;

-- 7. アプリケーションログを確認（もしあれば）
SELECT 
  id,
  user_id,
  action,
  table_name,
  record_id,
  created_at
FROM application_logs 
WHERE table_name = 'user_profiles'
  AND action = 'DELETE'
ORDER BY created_at DESC
LIMIT 10;

-- 8. 外部キー制約を確認
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_profiles';

-- 9. テーブルの統計情報を確認
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables 
WHERE tablename = 'user_profiles';


