-- すべてのRLSポリシーをクリーンアップして再作成
-- Supabase Dashboard > SQL Editor で実行

-- ========================================
-- STEP 1: 現在のポリシーをすべて確認
-- ========================================

SELECT
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, policyname;

-- ========================================
-- STEP 2: shift_requestsのすべてのポリシーを削除
-- ========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_requests'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shift_requests';
  END LOOP;
END $$;

-- ========================================
-- STEP 3: shift_postingsのすべてのポリシーを削除
-- ========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_postings'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shift_postings';
  END LOOP;
END $$;

-- ========================================
-- STEP 4: assigned_shiftsのすべてのポリシーを削除
-- ========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assigned_shifts'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON assigned_shifts';
  END LOOP;
END $$;

-- ========================================
-- STEP 5: 削除を確認
-- ========================================

SELECT
  'ポリシー削除完了' as status,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts');

-- ========================================
-- STEP 6: user_profilesのRLSを無効化
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 7: 新しいポリシーを作成
-- ========================================

-- shift_requests: SELECT
CREATE POLICY "admin_or_owner_can_select_requests"
ON shift_requests FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_requests: INSERT
CREATE POLICY "admin_or_owner_can_insert_requests"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  pharmacist_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_requests: UPDATE
CREATE POLICY "admin_or_owner_can_update_requests"
ON shift_requests FOR UPDATE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  pharmacist_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_requests: DELETE
CREATE POLICY "admin_or_owner_can_delete_requests"
ON shift_requests FOR DELETE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_postings: SELECT
CREATE POLICY "admin_or_owner_can_select_postings"
ON shift_postings FOR SELECT TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_postings: INSERT
CREATE POLICY "admin_or_owner_can_insert_postings"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- shift_postings: UPDATE
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

-- shift_postings: DELETE
CREATE POLICY "admin_or_owner_can_delete_postings"
ON shift_postings FOR DELETE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: SELECT
CREATE POLICY "admin_or_involved_can_select_shifts"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR pharmacy_id = auth.uid()
  OR (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: INSERT
CREATE POLICY "admin_can_insert_shifts"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: UPDATE
CREATE POLICY "admin_can_update_shifts"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: DELETE
CREATE POLICY "admin_can_delete_shifts"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- ========================================
-- STEP 8: 最終確認
-- ========================================

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

SELECT '✅ すべてのポリシーをクリーンアップして再作成しました' as status;
