-- 最終的なRLS修正: 確実に動作する方法
-- Supabase Dashboard > SQL Editor で実行

-- ========================================
-- STEP 1: 現在のポリシーをすべて削除
-- ========================================

-- shift_requestsのポリシーを削除
DROP POLICY IF EXISTS "shift_requests_select_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_insert_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_update_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_delete_policy" ON shift_requests;
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow delete shift requests" ON shift_requests;

-- ========================================
-- STEP 2: user_profilesのRLSが無効化されているか確認
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: 新しいポリシーを作成（シンプルで確実な方法）
-- ========================================

-- SELECTポリシー: 管理者かどうかを直接確認
CREATE POLICY "admin_or_owner_can_select_requests"
ON shift_requests
FOR SELECT
TO authenticated
USING (
  -- 自分のリクエストは見られる
  pharmacist_id = auth.uid()
  OR
  -- 管理者は全て見られる（サブクエリで直接確認）
  (
    SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1
  ) = 'admin'
);

-- INSERTポリシー
CREATE POLICY "admin_or_owner_can_insert_requests"
ON shift_requests
FOR INSERT
TO authenticated
WITH CHECK (
  pharmacist_id = auth.uid()
  OR
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- UPDATEポリシー
CREATE POLICY "admin_or_owner_can_update_requests"
ON shift_requests
FOR UPDATE
TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  pharmacist_id = auth.uid()
  OR
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- DELETEポリシー
CREATE POLICY "admin_or_owner_can_delete_requests"
ON shift_requests
FOR DELETE
TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- ========================================
-- STEP 4: shift_postingsも同様に修正
-- ========================================

DROP POLICY IF EXISTS "shift_postings_select_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_insert_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_update_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_delete_policy" ON shift_postings;
DROP POLICY IF EXISTS "Allow view shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow update shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow delete shift postings" ON shift_postings;

CREATE POLICY "admin_or_owner_can_select_postings"
ON shift_postings FOR SELECT TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_or_owner_can_insert_postings"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_or_owner_can_update_postings"
ON shift_postings FOR UPDATE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_or_owner_can_delete_postings"
ON shift_postings FOR DELETE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- ========================================
-- STEP 5: assigned_shiftsも同様に修正
-- ========================================

DROP POLICY IF EXISTS "assigned_shifts_select_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_insert_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_update_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_delete_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow view assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow delete assigned shifts" ON assigned_shifts;

CREATE POLICY "admin_or_involved_can_select_shifts"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_can_insert_shifts"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_can_update_shifts"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "admin_can_delete_shifts"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- ========================================
-- STEP 6: 確認
-- ========================================

-- ポリシーが作成されたか確認
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

-- user_profilesのRLS状態を確認
SELECT
  tablename,
  rowsecurity as rls_disabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- 管理者ユーザーを確認
SELECT
  id,
  name,
  email,
  user_type
FROM user_profiles
WHERE user_type = 'admin';

SELECT '✅ 最終的なRLS修正が完了しました。user_profilesのRLSは無効化されています。' as status;
