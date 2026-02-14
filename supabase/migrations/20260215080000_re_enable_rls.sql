-- RLSを再有効化
-- 前回のマイグレーション (20260215070000) で一時的に無効化したRLSを再有効化

-- ========================================
-- STEP 1: RLSを再有効化
-- ========================================

ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: 既存のポリシーを確認（20260215060000で作成されたポリシー）
-- ========================================

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd;

-- ========================================
-- STEP 3: RLS状態を確認
-- ========================================

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts', 'user_profiles')
ORDER BY tablename;

SELECT '✅ RLSを再有効化しました。セキュリティポリシーが適用されています。' as status;
