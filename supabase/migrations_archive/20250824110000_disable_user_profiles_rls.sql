-- 一時的にuser_profilesテーブルのRLSを無効化（デバッグ用）
-- 注意: 本番環境では使用しないでください

-- RLSを無効化
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- 全ユーザーが読み取り可能なポリシーを作成
CREATE POLICY "Allow all authenticated users to read profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
