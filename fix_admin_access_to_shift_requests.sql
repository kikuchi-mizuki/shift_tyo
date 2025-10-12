-- 管理者がshift_requestsテーブルにアクセスできるようにRLSポリシーを修正

-- 1. 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Users can insert their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Users can update their own shift requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacists can manage own requests" ON shift_requests;
DROP POLICY IF EXISTS "Pharmacies and admins can read all requests" ON shift_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON shift_requests;

-- 2. 新しいRLSポリシーを作成
-- 薬剤師は自分の希望を管理可能
CREATE POLICY "Pharmacists can manage own requests"
  ON shift_requests
  FOR ALL
  TO authenticated
  USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacist'
    )
  );

-- 管理者は全ての希望を閲覧・管理可能
CREATE POLICY "Admins can manage all requests"
  ON shift_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- 薬局は全ての希望を閲覧可能
CREATE POLICY "Pharmacies can read all requests"
  ON shift_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacy'
    )
  );

-- 3. RLSが有効になっていることを確認
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- 4. ポリシーの確認
SELECT 
  '修正後のRLSポリシー' as info,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'shift_requests'
ORDER BY policyname;
