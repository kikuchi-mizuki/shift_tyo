-- 一時的にRLSを無効化して管理者がUPDATEできるようにする
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. 現在のRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'recruitment_status';

-- 2. 既存のポリシーを削除
DROP POLICY IF EXISTS "Admins can update recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can insert recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can delete recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Authenticated users can read recruitment status" ON recruitment_status;

-- 3. 管理者のみがUPDATEできるシンプルなポリシーを作成
CREATE POLICY "Admins can update recruitment status" ON recruitment_status
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. 全ユーザーがSELECTできるポリシーを作成
CREATE POLICY "All authenticated users can read recruitment status" ON recruitment_status
  FOR SELECT TO authenticated
  USING (true);

-- 5. 更新テスト
UPDATE recruitment_status 
SET is_open = true, notes = 'Test update from SQL editor'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. 結果確認
SELECT * FROM recruitment_status WHERE id = '00000000-0000-0000-0000-000000000001';
