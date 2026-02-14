-- 最終確認: すべてが正しく設定されているか確認
-- Supabase Dashboard > SQL Editor で実行

-- 1. user_profilesのRLSが無効化されているか確認
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity = false THEN '✅ RLS無効（正しい）'
    ELSE '❌ RLSが有効（問題あり）'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- 2. shift_requestsのポリシーが正しく作成されているか確認
SELECT
  policyname,
  cmd as command,
  CASE cmd
    WHEN 'SELECT' THEN '✅'
    WHEN 'INSERT' THEN '✅'
    WHEN 'UPDATE' THEN '✅'
    WHEN 'DELETE' THEN '✅'
    ELSE '❓'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
ORDER BY cmd, policyname;

-- 3. 3月2日のデータが存在するか確認（RLSを無視）
SELECT
  COUNT(*) as total_count,
  '期待値: 10件' as note
FROM shift_requests
WHERE date = '2026-03-02';

-- 4. すべての3月データの日付別集計
SELECT
  date,
  COUNT(*) as count
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01'
GROUP BY date
ORDER BY date;

-- 結果サマリー
SELECT '
📊 確認結果:
1. user_profilesのRLSが無効化されている → ポリシーのEXISTS句が動作する
2. shift_requestsに4つのポリシーが存在する（SELECT, INSERT, UPDATE, DELETE）
3. 3月2日のデータが10件存在する

✅ すべて正常なら、アプリケーションをリロードしてください。
' as summary;
