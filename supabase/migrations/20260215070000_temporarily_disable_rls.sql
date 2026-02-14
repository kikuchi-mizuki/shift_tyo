-- 一時的にRLSを無効化してテスト
-- これでデータが取得できれば、RLSポリシーに問題があることが確定

-- shift_requestsのRLSを一時的に無効化
ALTER TABLE shift_requests DISABLE ROW LEVEL SECURITY;

-- shift_postingsのRLSを一時的に無効化
ALTER TABLE shift_postings DISABLE ROW LEVEL SECURITY;

-- assigned_shiftsのRLSを一時的に無効化
ALTER TABLE assigned_shifts DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts', 'user_profiles')
ORDER BY tablename;

SELECT '⚠️ RLSを一時的に無効化しました。テスト後は必ず再有効化してください。' as warning;
