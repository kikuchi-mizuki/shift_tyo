-- 管理者セッションでRLSポリシーをテスト
-- Supabase Dashboard > SQL Editor で実行してください

-- 1. 管理者ユーザーの存在確認
SELECT
  id,
  name,
  email,
  user_type
FROM user_profiles
WHERE id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

-- 2. user_profilesのRLS状態を確認
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- 3. shift_requestsの現在のRLSポリシーを確認
SELECT
  policyname,
  cmd,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
ORDER BY cmd, policyname;

-- 4. 管理者として認証されているか確認するクエリ
-- このクエリは、管理者がどのレコードを見られるかシミュレートします
SELECT
  sr.id,
  sr.pharmacist_id,
  sr.date,
  up.name as pharmacist_name,
  -- RLSポリシーの条件をシミュレート
  (sr.pharmacist_id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3') as is_own_record,
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = '0e665ba6-06ae-48eb-be73-eba61d72d6b3'
      AND user_profiles.user_type = 'admin'
  ) as is_admin_check
FROM shift_requests sr
LEFT JOIN user_profiles up ON sr.pharmacist_id = up.id
WHERE sr.date = '2026-03-02'
ORDER BY sr.created_at;

-- 5. user_profilesテーブルのRLSが本当に無効化されているか確認
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 6. 再度確認
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';
