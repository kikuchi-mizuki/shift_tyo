# データベースセットアップ手順

## 問題
`Database error saving new user` エラーが発生しています。これは`user_profiles`テーブルのトリガー関数が正しく設定されていないことが原因です。

## 解決方法

### 1. Supabaseダッシュボードにアクセス
1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. あなたのプロジェクト（wjgterfwurmvosawzbjs）を選択

### 2. SQL Editorで最新のマイグレーションを実行
1. 左サイドバーの **SQL Editor** をクリック
2. **New query** をクリック
3. 以下のSQLコードを**順番に**実行してください：

#### ステップ1: 最新のマイグレーション（20250824084029_still_lagoon.sql）を実行

```sql
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
```

### 3. SQLを実行
1. **RUN** ボタンをクリックしてSQLを実行
2. 成功メッセージが表示されることを確認

### 4. テーブル作成の確認
1. 左サイドバーの **Table Editor** をクリック
2. `user_profiles` テーブルが作成されていることを確認
3. テーブルに以下のカラムがあることを確認：
   - `id` (uuid, primary key)
   - `name` (text)
   - `email` (text)
   - `user_type` (text)
   - `license_number` (text, nullable)
   - `pharmacy_id` (text, nullable)
   - `experience` (integer, nullable)
   - `specialties` (text[], nullable)
   - `ng_list` (text[], nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

### 5. トリガー関数の確認
1. SQL Editorで以下のクエリを実行してトリガーが正しく設定されているか確認：

```sql
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.event_object_table,
  t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_name = 'on_auth_user_created';
```

### 6. アプリケーションをテスト
1. ブラウザでアプリケーションをリロード
2. 新規ユーザー登録を試行
3. エラーが解消されていることを確認

## 注意事項
- このSQLは既存のデータを削除しません
- 既存ユーザーのプロファイルも自動的に作成されます
- トリガー関数は基テーブル（`user_profiles`）に正しく書き込むよう修正されています

## トラブルシューティング
もしまだエラーが発生する場合は：
1. `user_profiles`テーブルが存在するか確認
2. RLS（Row Level Security）が正しく設定されているか確認
3. トリガー関数が正しく作成されているか確認