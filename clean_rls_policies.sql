-- 全てのRLSポリシーを削除して、シンプルな1つのポリシーに置き換える
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. 全ての既存ポリシーを削除
DROP POLICY IF EXISTS "Admins can update recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can update recruitment status (by email)" ON recruitment_status;
DROP POLICY IF EXISTS "read recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "update recruitment status by admin email" ON recruitment_status;
DROP POLICY IF EXISTS "Simple update policy" ON recruitment_status;
DROP POLICY IF EXISTS "Simple select policy" ON recruitment_status;
DROP POLICY IF EXISTS "Authenticated users can read recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "All authenticated users can read recruitment status" ON recruitment_status;

-- 2. シンプルなポリシーを1つだけ作成
CREATE POLICY "Allow all authenticated users" ON recruitment_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. 直接UPDATEテスト
UPDATE recruitment_status 
SET is_open = true, notes = 'Test update after policy cleanup'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 4. 結果確認
SELECT * FROM recruitment_status WHERE id = '00000000-0000-0000-0000-000000000001';
