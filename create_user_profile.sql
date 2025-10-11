-- 現在のユーザーのプロフィールを作成

-- 1. 現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- 2. user_profilesテーブルに現在のユーザーを追加
INSERT INTO user_profiles (
  id,
  email,
  name,
  user_type,
  line_notification_enabled,
  created_at,
  updated_at
) VALUES (
  auth.uid(),
  auth.email(),  -- Supabaseの認証から取得
  'ユーザー名',  -- 適切な名前に変更してください
  'pharmacist',  -- 薬剤師の場合: 'pharmacist', 薬局の場合: 'pharmacy'
  true,          -- LINE通知を有効にする
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  user_type = EXCLUDED.user_type,
  line_notification_enabled = EXCLUDED.line_notification_enabled,
  updated_at = NOW();

-- 3. 作成されたプロフィールを確認
SELECT 
  id,
  name,
  user_type,
  email,
  line_user_id,
  line_notification_enabled,
  line_linked_at,
  created_at
FROM user_profiles 
WHERE id = auth.uid();
