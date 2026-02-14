/*
  # ユーザープロファイルテーブルの作成

  1. 新しいテーブル
    - `user_profiles`
      - `id` (uuid, primary key, auth.users.idと連携)
      - `name` (text)
      - `email` (text)
      - `user_type` (text) - 'pharmacist', 'pharmacy', 'admin'
      - `license_number` (text, nullable) - 薬剤師免許番号
      - `pharmacy_id` (text, nullable) - 薬局ID
      - `experience` (integer, nullable) - 経験年数
      - `specialties` (text[], nullable) - 専門分野
      - `ng_list` (text[], nullable) - NGリスト
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. セキュリティ
    - RLSを有効化
    - ユーザーは自分のプロファイルのみ読み書き可能
    - 管理者は全てのプロファイルを管理可能
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('pharmacist', 'pharmacy', 'admin')),
  license_number text,
  pharmacy_id text,
  experience integer,
  specialties text[],
  ng_list text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルを読み書き可能
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 管理者は全てのプロファイルを管理可能
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- プロファイル作成時のトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email, user_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', 'pharmacist')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();