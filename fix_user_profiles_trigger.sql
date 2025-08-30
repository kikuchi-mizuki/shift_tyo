/*
  # 新規登録時のuser_profilesテーブル自動作成を修正

  1. 問題
    - 新規登録時にuser_profilesテーブルにデータが保存されない
    - トリガー関数が正しく設定されていない

  2. 解決方法
    - 既存のトリガーと関数を削除
    - 最新のトリガー関数を作成
    - auth.usersテーブルにトリガーを設定
*/

-- 1) 既存のトリガー/関数を削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2) user_profilesテーブルが存在することを確認
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('pharmacist', 'pharmacy', 'admin', 'store')),
  license_number text,
  pharmacy_id text,
  experience integer,
  specialties text[],
  ng_list text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) RLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4) 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to read profiles" ON user_profiles;

-- 5) 新しいポリシーを作成
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

CREATE POLICY "Allow all authenticated users to read profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 6) 新規ユーザー作成時のトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_type text := COALESCE(NEW.raw_user_meta_data->>'user_type', NEW.raw_user_meta_data->>'role', 'pharmacist');
  v_name text := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', NEW.email);
BEGIN
  -- user_profiles テーブルに挿入
  INSERT INTO public.user_profiles (
    id, 
    name, 
    email, 
    user_type,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_user_type,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 7) auth.users にトリガーを設定
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) 既存ユーザーのバックフィル（user_profilesに存在しないユーザーを追加）
INSERT INTO public.user_profiles (id, name, email, user_type, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'display_name', u.email) as name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', 'pharmacist') as user_type,
  u.created_at,
  u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
WHERE up.id IS NULL;

-- 9) トリガーが正しく設定されているか確認
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.event_object_table,
  t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_name = 'on_auth_user_created';
