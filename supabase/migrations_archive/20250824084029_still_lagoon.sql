/*
  # トリガー関数を基テーブルに書き込むよう修正

  1. 問題
    - handle_new_user()関数がuser_profiles（VIEW）に挿入しようとして失敗
    - VIEWは読み取り専用のため、insert/updateできない

  2. 解決方法
    - トリガー関数を基テーブル（user_profiles TABLE）に書き込むよう修正
    - 既存のトリガーと関数を安全に作り直し
    - 既存ユーザーのバックフィル処理も含める
*/

-- 1) 既存のトリガー/関数を消してから作り直し
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2) サインアップ直後に基テーブルへ行を作る関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_type text := COALESCE(NEW.raw_user_meta_data->>'user_type', NEW.raw_user_meta_data->>'role', 'pharmacist');
  v_name text := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', NEW.email);
BEGIN
  -- user_profiles テーブル（基テーブル）に挿入
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

-- 3) auth.users にトリガー付与（サインアップ直後に動く）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) 既存ユーザーの欠落を埋める（バックフィル）
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