-- 実際のRLSポリシーの動作を確認
-- Supabase Dashboard > SQL Editor で実行

-- 1. 現在のshift_requestsのポリシーを確認
SELECT
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
ORDER BY cmd, policyname;

-- 2. user_profilesのRLS状態
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- 3. 管理者ユーザーの確認
SELECT
  id,
  name,
  user_type
FROM user_profiles
WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

-- 4. 3月2日のデータを直接SELECTで確認（RLSを無視）
SELECT COUNT(*) as total_count
FROM shift_requests
WHERE date = '2026-03-02';

-- 5. 管理者としてアクセスした場合のシミュレーション
-- この管理者IDでuser_typeがadminか確認
SELECT
  (SELECT user_type FROM user_profiles WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3') as user_type_result;

-- 6. ポリシーの評価をテスト
-- 管理者ポリシーが真になるか
SELECT
  id,
  pharmacist_id,
  date,
  (SELECT user_type FROM user_profiles WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3') = 'admin' as admin_policy_result
FROM shift_requests
WHERE date = '2026-03-02'
LIMIT 5;
