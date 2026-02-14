-- ========================================
-- RLS ポリシー修正スクリプト（シンプル版）
-- Supabase Dashboard > SQL Editor で実行してください
-- ========================================

-- 古い関数を削除
DROP FUNCTION IF EXISTS public.is_admin();

-- ========================================
-- shift_requests テーブルのポリシー修正
-- ========================================

-- 古いポリシーを全て削除
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can view all shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can view own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can insert shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can insert own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can update shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can update own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Allow delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can delete shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can delete own shift requests" ON shift_requests;

-- 新しいポリシーを作成
CREATE POLICY "shift_requests_select_policy" ON shift_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_insert_policy" ON shift_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_update_policy" ON shift_requests
FOR UPDATE TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_requests_delete_policy" ON shift_requests
FOR DELETE TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- shift_postings テーブルのポリシー修正
-- ========================================

-- 古いポリシーを全て削除
DROP POLICY IF EXISTS "Allow view shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can view all shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can view own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can insert shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can insert own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow update shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can update shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can update own shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Allow delete shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Admins can delete shift postings" ON shift_postings;
DROP POLICY IF EXISTS "Pharmacies can delete own shift postings" ON shift_postings;

-- 新しいポリシーを作成
CREATE POLICY "shift_postings_select_policy" ON shift_postings
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_insert_policy" ON shift_postings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_update_policy" ON shift_postings
FOR UPDATE TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "shift_postings_delete_policy" ON shift_postings
FOR DELETE TO authenticated
USING (
  auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- assigned_shifts テーブルのポリシー修正
-- ========================================

-- 古いポリシーを全て削除
DROP POLICY IF EXISTS "Allow view assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can view all assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Users can view own assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can insert assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can update assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Allow delete assigned shifts" ON assigned_shifts;
DROP POLICY IF EXISTS "Admins can delete assigned shifts" ON assigned_shifts;

-- 新しいポリシーを作成
CREATE POLICY "assigned_shifts_select_policy" ON assigned_shifts
FOR SELECT TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR auth.uid() = pharmacy_id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_insert_policy" ON assigned_shifts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_update_policy" ON assigned_shifts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

CREATE POLICY "assigned_shifts_delete_policy" ON assigned_shifts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
  )
);

-- ========================================
-- 確認クエリ
-- ========================================

-- ポリシーが正しく作成されたか確認
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

-- データが取得できるか確認
SELECT
  'shift_requests' as table_name,
  COUNT(*) as total_count
FROM shift_requests
UNION ALL
SELECT
  'shift_postings' as table_name,
  COUNT(*) as total_count
FROM shift_postings
UNION ALL
SELECT
  'assigned_shifts' as table_name,
  COUNT(*) as total_count
FROM assigned_shifts;

-- 完了メッセージ
SELECT '✅ RLSポリシーの修正が完了しました。上記の結果を確認してください。' as status;
