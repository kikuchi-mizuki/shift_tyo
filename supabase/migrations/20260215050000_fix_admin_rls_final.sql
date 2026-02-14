-- 管理者のRLS問題を最終的に修正
-- user_type='admin'のユーザーは全てのデータにアクセス可能にする

-- ========================================
-- STEP 1: 既存のポリシーをすべて削除
-- ========================================

DROP POLICY IF EXISTS "requests_select_policy" ON shift_requests;
DROP POLICY IF EXISTS "requests_insert_policy" ON shift_requests;
DROP POLICY IF EXISTS "requests_update_policy" ON shift_requests;
DROP POLICY IF EXISTS "requests_delete_policy" ON shift_requests;

DROP POLICY IF EXISTS "postings_select_policy" ON shift_postings;
DROP POLICY IF EXISTS "postings_insert_policy" ON shift_postings;
DROP POLICY IF EXISTS "postings_update_policy" ON shift_postings;
DROP POLICY IF EXISTS "postings_delete_policy" ON shift_postings;

DROP POLICY IF EXISTS "shifts_select_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON assigned_shifts;

-- ========================================
-- STEP 2: user_profilesのRLSを確実に無効化
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- user_profilesの既存のポリシーもすべて削除
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
  END LOOP;
END $$;

-- ========================================
-- STEP 3: 新しいポリシーを作成（管理者優先）
-- ========================================

-- shift_requests: SELECT
-- 管理者用と一般ユーザー用を分離
CREATE POLICY "admin_select_all_requests"
ON shift_requests FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacist_select_own_requests"
ON shift_requests FOR SELECT TO authenticated
USING (
  pharmacist_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_requests: INSERT
CREATE POLICY "admin_insert_all_requests"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacist_insert_own_requests"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  pharmacist_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_requests: UPDATE
CREATE POLICY "admin_update_all_requests"
ON shift_requests FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacist_update_own_requests"
ON shift_requests FOR UPDATE TO authenticated
USING (
  pharmacist_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_requests: DELETE
CREATE POLICY "admin_delete_all_requests"
ON shift_requests FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacist_delete_own_requests"
ON shift_requests FOR DELETE TO authenticated
USING (
  pharmacist_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_postings: SELECT
CREATE POLICY "admin_select_all_postings"
ON shift_postings FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacy_select_own_postings"
ON shift_postings FOR SELECT TO authenticated
USING (
  pharmacy_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_postings: INSERT
CREATE POLICY "admin_insert_all_postings"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacy_insert_own_postings"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  pharmacy_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_postings: UPDATE
CREATE POLICY "admin_update_all_postings"
ON shift_postings FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacy_update_own_postings"
ON shift_postings FOR UPDATE TO authenticated
USING (
  pharmacy_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- shift_postings: DELETE
CREATE POLICY "admin_delete_all_postings"
ON shift_postings FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "pharmacy_delete_own_postings"
ON shift_postings FOR DELETE TO authenticated
USING (
  pharmacy_id = auth.uid()
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- assigned_shifts: SELECT
CREATE POLICY "admin_select_all_shifts"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "involved_select_own_shifts"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  (pharmacist_id = auth.uid() OR pharmacy_id = auth.uid())
  AND (SELECT user_type FROM user_profiles WHERE id = auth.uid()) != 'admin'
);

-- assigned_shifts: INSERT (管理者のみ)
CREATE POLICY "admin_insert_shifts"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- assigned_shifts: UPDATE (管理者のみ)
CREATE POLICY "admin_update_shifts"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- assigned_shifts: DELETE (管理者のみ)
CREATE POLICY "admin_delete_shifts"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
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

SELECT '✅ 管理者優先のRLSポリシーを作成しました' as status;
