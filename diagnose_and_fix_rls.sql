-- 診断と修正: shift_requestsのRLSポリシー問題
-- 実行場所: Supabase Dashboard > SQL Editor

-- ========================================
-- STEP 1: 現在の状態を確認
-- ========================================

-- 1-1. RLSが有効かどうか確認
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'shift_requests';

-- 1-2. 現在のポリシーを確認
SELECT
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
ORDER BY policyname;

-- 1-3. is_admin()関数が存在するか確認
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- 1-4. テストデータ件数を確認
SELECT COUNT(*) as total_requests FROM shift_requests;

SELECT COUNT(*) as march_2_requests
FROM shift_requests
WHERE date = '2026-03-02';

-- ========================================
-- STEP 2: 問題を修正
-- ========================================

-- 2-1. 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can view all shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can view own shift requests" ON shift_requests;

-- 2-2. is_admin()関数を削除（もし存在すれば）
DROP FUNCTION IF EXISTS public.is_admin();

-- 2-3. 新しいポリシーを作成（関数を使わない、シンプルで確実な方法）
CREATE POLICY "Admin and owner can view shift requests"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  -- 自分のリクエストは見られる
  auth.uid() = pharmacist_id
  OR
  -- 管理者は全て見られる
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- 2-4. INSERTポリシーも確認して修正
DROP POLICY IF EXISTS "Allow insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can insert own shift requests" ON shift_requests;

CREATE POLICY "Admin and owner can insert shift requests"
ON shift_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- 自分のリクエストとして作成できる
  auth.uid() = pharmacist_id
  OR
  -- 管理者は誰のリクエストでも作成できる
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- 2-5. UPDATEポリシーも確認して修正
DROP POLICY IF EXISTS "Allow update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can update own shift requests" ON shift_requests;

CREATE POLICY "Admin and owner can update shift requests"
ON shift_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- 2-6. DELETEポリシーも確認して修正
DROP POLICY IF EXISTS "Allow delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can delete own shift requests" ON shift_requests;

CREATE POLICY "Admin and owner can delete shift requests"
ON shift_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- STEP 3: 修正後の確認
-- ========================================

-- 3-1. 新しいポリシーを確認
SELECT
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
ORDER BY policyname;

-- 3-2. テストクエリ（管理者として実行）
SELECT
  date,
  COUNT(*) as count
FROM shift_requests
GROUP BY date
ORDER BY date;

-- 3-3. 3月2日のデータを確認
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at
FROM shift_requests
WHERE date = '2026-03-02'
ORDER BY created_at;

-- 完了メッセージ
SELECT '✅ RLSポリシーの診断と修正が完了しました' as status;
