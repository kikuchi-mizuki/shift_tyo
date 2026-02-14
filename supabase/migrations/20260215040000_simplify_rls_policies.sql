-- RLSポリシーをさらにシンプルに修正
-- user_profilesのRLSが無効なので、サブクエリを直接使用

-- ========================================
-- STEP 1: 既存のポリシーをすべて削除
-- ========================================

DROP POLICY IF EXISTS "admin_or_owner_select_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_insert_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_update_requests" ON shift_requests;
DROP POLICY IF EXISTS "admin_or_owner_delete_requests" ON shift_requests;

DROP POLICY IF EXISTS "admin_or_owner_select_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_insert_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_update_postings" ON shift_postings;
DROP POLICY IF EXISTS "admin_or_owner_delete_postings" ON shift_postings;

DROP POLICY IF EXISTS "admin_or_involved_select_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_insert_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_update_shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "admin_delete_shifts" ON assigned_shifts;

-- ========================================
-- STEP 2: user_profilesのRLSを再確認して無効化
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: 新しいポリシーを作成（サブクエリで直接チェック）
-- ========================================

-- shift_requests: SELECT
CREATE POLICY "requests_select_policy"
ON shift_requests FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_requests: INSERT
CREATE POLICY "requests_insert_policy"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  pharmacist_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_requests: UPDATE
CREATE POLICY "requests_update_policy"
ON shift_requests FOR UPDATE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  pharmacist_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_requests: DELETE
CREATE POLICY "requests_delete_policy"
ON shift_requests FOR DELETE TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_postings: SELECT
CREATE POLICY "postings_select_policy"
ON shift_postings FOR SELECT TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_postings: INSERT
CREATE POLICY "postings_insert_policy"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_postings: UPDATE
CREATE POLICY "postings_update_policy"
ON shift_postings FOR UPDATE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- shift_postings: DELETE
CREATE POLICY "postings_delete_policy"
ON shift_postings FOR DELETE TO authenticated
USING (
  pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- assigned_shifts: SELECT
CREATE POLICY "shifts_select_policy"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  OR pharmacy_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- assigned_shifts: INSERT
CREATE POLICY "shifts_insert_policy"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- assigned_shifts: UPDATE
CREATE POLICY "shifts_update_policy"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- assigned_shifts: DELETE
CREATE POLICY "shifts_delete_policy"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- STEP 4: 確認
-- ========================================

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

SELECT '✅ RLSポリシーをシンプル化しました（EXISTS + サブクエリ）' as status;
