-- RLSポリシーの最終修正
-- user_profilesテーブルへのアクセス権限を確認し、確実に動作するポリシーに変更

-- ========================================
-- STEP 1: user_profilesのRLS状態を確認
-- ========================================

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- ========================================
-- STEP 2: user_profilesのRLSを一時的に無効化
-- （EXISTS句でアクセスできるようにする）
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: shift_requestsのポリシーを再作成
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "shift_requests_select_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_insert_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_update_policy" ON shift_requests;
DROP POLICY IF EXISTS "shift_requests_delete_policy" ON shift_requests;

-- 新しいポリシーを作成（user_profilesへのアクセスが確実に動作する）
CREATE POLICY "shift_requests_select_policy" ON shift_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_insert_policy" ON shift_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = pharmacist_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_update_policy" ON shift_requests
FOR UPDATE TO authenticated
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

CREATE POLICY "shift_requests_delete_policy" ON shift_requests
FOR DELETE TO authenticated
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
-- STEP 4: shift_postingsのポリシーも同様に修正
-- ========================================

DROP POLICY IF EXISTS "shift_postings_select_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_insert_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_update_policy" ON shift_postings;
DROP POLICY IF EXISTS "shift_postings_delete_policy" ON shift_postings;

CREATE POLICY "shift_postings_select_policy" ON shift_postings
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_insert_policy" ON shift_postings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_update_policy" ON shift_postings
FOR UPDATE TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_delete_policy" ON shift_postings
FOR DELETE TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- STEP 5: assigned_shiftsのポリシーも同様に修正
-- ========================================

DROP POLICY IF EXISTS "assigned_shifts_select_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_insert_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_update_policy" ON assigned_shifts;
DROP POLICY IF EXISTS "assigned_shifts_delete_policy" ON assigned_shifts;

CREATE POLICY "assigned_shifts_select_policy" ON assigned_shifts
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR auth.uid() = pharmacy_id
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_insert_policy" ON assigned_shifts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_update_policy" ON assigned_shifts
FOR UPDATE TO authenticated
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

CREATE POLICY "assigned_shifts_delete_policy" ON assigned_shifts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  )
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
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

SELECT '✅ RLSポリシーの修正が完了しました。user_profilesのRLSを無効化しました。' as status;
