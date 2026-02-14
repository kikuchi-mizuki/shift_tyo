-- 最もシンプルなRLSポリシー: 1つのポリシーで管理者と一般ユーザーの両方をカバー

-- ========================================
-- STEP 1: 既存のポリシーをすべて削除
-- ========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- shift_requestsの全ポリシーを削除
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_requests'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shift_requests';
  END LOOP;

  -- shift_postingsの全ポリシーを削除
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_postings'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shift_postings';
  END LOOP;

  -- assigned_shiftsの全ポリシーを削除
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
-- STEP 2: user_profilesのRLSを確実に無効化
-- ========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: 最もシンプルなポリシーを作成（1ポリシーで全操作）
-- ========================================

-- shift_requests: SELECT（1つのポリシーで管理者とオーナーの両方）
CREATE POLICY "select_requests_policy"
ON shift_requests FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
);

-- shift_requests: INSERT
CREATE POLICY "insert_requests_policy"
ON shift_requests FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
);

-- shift_requests: UPDATE
CREATE POLICY "update_requests_policy"
ON shift_requests FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
)
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
);

-- shift_requests: DELETE
CREATE POLICY "delete_requests_policy"
ON shift_requests FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
);

-- shift_postings: SELECT
CREATE POLICY "select_postings_policy"
ON shift_postings FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacy_id = auth.uid()
);

-- shift_postings: INSERT
CREATE POLICY "insert_postings_policy"
ON shift_postings FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacy_id = auth.uid()
);

-- shift_postings: UPDATE
CREATE POLICY "update_postings_policy"
ON shift_postings FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacy_id = auth.uid()
)
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacy_id = auth.uid()
);

-- shift_postings: DELETE
CREATE POLICY "delete_postings_policy"
ON shift_postings FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacy_id = auth.uid()
);

-- assigned_shifts: SELECT
CREATE POLICY "select_shifts_policy"
ON assigned_shifts FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  OR pharmacist_id = auth.uid()
  OR pharmacy_id = auth.uid()
);

-- assigned_shifts: INSERT（管理者のみ）
CREATE POLICY "insert_shifts_policy"
ON assigned_shifts FOR INSERT TO authenticated
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: UPDATE（管理者のみ）
CREATE POLICY "update_shifts_policy"
ON assigned_shifts FOR UPDATE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- assigned_shifts: DELETE（管理者のみ）
CREATE POLICY "delete_shifts_policy"
ON assigned_shifts FOR DELETE TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
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
ORDER BY tablename, cmd;

SELECT '✅ シンプルなRLSポリシーを作成しました（1テーブル1操作1ポリシー）' as status;
