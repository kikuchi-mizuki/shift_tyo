-- LINE認証コードテーブルのRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own auth codes" ON line_auth_codes;
DROP POLICY IF EXISTS "Users can create own auth codes" ON line_auth_codes;

-- 新しいポリシーを作成（より柔軟な条件）
CREATE POLICY "Users can manage own auth codes"
  ON line_auth_codes
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- 一時的にRLSを無効化してテスト（必要に応じて）
-- ALTER TABLE line_auth_codes DISABLE ROW LEVEL SECURITY;

-- デバッグ用：テーブル構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'line_auth_codes' 
ORDER BY ordinal_position;
