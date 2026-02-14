-- 管理者のデータアクセス問題を修正
-- 管理者が全データを見られるようにRLSポリシーを修正

-- ========================================
-- STEP 1: 既存のポリシーをすべて削除
-- ========================================

DROP POLICY IF EXISTS "admin_or_owner_can_select_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_can_insert_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_can_update_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_can_delete_requests" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_select_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_insert_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_update_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_delete_policy" ON shift_requests;

DROP POLICY IF EXISTS "admin_or_owner_can_select_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_can_insert_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_can_update_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_can_delete_postings" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_select_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_insert_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_update_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_delete_policy" ON shift_postings;

DROP POLICY IF EXISTS "admin_or_involved_can_select_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_can_insert_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_can_update_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_can_delete_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_select_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_insert_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_update_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_delete_policy" ON assigned_shifts;

-- ========================================
-- STEP 2: user_profilesのRLSを確実に無効化
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: ヘルパー関数を作成（サブクエリの代わり）
-- ========================================

-- 既存の関数を削除
DROP FUNCTION IF EXISTS public.is_admin();

-- 管理者チェック関数を作成
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
$$;

-- ========================================
-- STEP 4: 新しいポリシーを作成（関数を使用）
-- ========================================

-- shift_requests: SELECT
CREATE POLICY "admin_or_owner_select_requests"
ON shift_requests FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR public.is_admin()
);

-- shift_requests: INSERT
CREATE POLICY "admin_or_owner_insert_requests"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  pharmacist_id = auth.uid()
  OR public.is_admin()
);

-- shift_requests: UPDATE
CREATE POLICY "admin_or_owner_update_requests"
ON shift_requests FOR UPDATE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  pharmacist_id = auth.uid()
  OR public.is_admin()
);

-- shift_requests: DELETE
CREATE POLICY "admin_or_owner_delete_requests"
ON shift_requests FOR DELETE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR public.is_admin()
);

-- shift_postings: SELECT
CREATE POLICY "admin_or_owner_select_postings"
ON shift_postings FOR SELECT TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR public.is_admin()
);

-- shift_postings: INSERT
CREATE POLICY "admin_or_owner_insert_postings"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  pharmacy_id = auth.uid()
  OR public.is_admin()
);

-- shift_postings: UPDATE
CREATE POLICY "admin_or_owner_update_postings"
ON shift_postings FOR UPDATE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  pharmacy_id = auth.uid()
  OR public.is_admin()
);

-- shift_postings: DELETE
CREATE POLICY "admin_or_owner_delete_postings"
ON shift_postings FOR DELETE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR public.is_admin()
);

-- assigned_shifts: SELECT
CREATE POLICY "admin_or_involved_select_shifts"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR pharmacy_id = auth.uid()
  OR public.is_admin()
);

-- assigned_shifts: INSERT
CREATE POLICY "admin_insert_shifts"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
);

-- assigned_shifts: UPDATE
CREATE POLICY "admin_update_shifts"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- assigned_shifts: DELETE
CREATE POLICY "admin_delete_shifts"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  public.is_admin()
);

-- ========================================
-- STEP 5: 確認
-- ========================================

-- 作成したポリシーを確認
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

-- ヘルパー関数を確認
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

SELECT '✅ RLSポリシーを関数ベースに修正しました' as status;
