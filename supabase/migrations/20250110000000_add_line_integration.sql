-- LINE連携機能のためのデータベーススキーマ追加
-- user_profilesテーブルにLINE関連カラムを追加

-- LINE User IDとその他の設定を追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS line_notification_enabled BOOLEAN DEFAULT true;

-- LINE連携用の一時認証コードテーブル
CREATE TABLE IF NOT EXISTS line_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  auth_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 認証コードテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_line_auth_codes_auth_code ON line_auth_codes(auth_code) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_line_auth_codes_user_id ON line_auth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_line_auth_codes_expires_at ON line_auth_codes(expires_at) WHERE NOT used;

-- LINE通知履歴テーブル（オプション: デバッグや監査用）
CREATE TABLE IF NOT EXISTS line_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  line_user_id TEXT,
  notification_type TEXT NOT NULL, -- 'shift_confirmed', 'reminder', 'emergency'
  message TEXT,
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知履歴のインデックス
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_user_id ON line_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_sent_at ON line_notification_logs(sent_at);

-- RLS設定
ALTER TABLE line_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_notification_logs ENABLE ROW LEVEL SECURITY;

-- 認証コードは自分のものだけ閲覧可能
CREATE POLICY "Users can view own auth codes"
  ON line_auth_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 認証コードは自分のものだけ作成可能
CREATE POLICY "Users can create own auth codes"
  ON line_auth_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 通知履歴は自分のものだけ閲覧可能
CREATE POLICY "Users can view own notification logs"
  ON line_notification_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理者は全ての通知履歴を閲覧可能
CREATE POLICY "Admins can view all notification logs"
  ON line_notification_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- 古い認証コードを削除する関数（期限切れ後24時間で削除）
CREATE OR REPLACE FUNCTION cleanup_expired_auth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM line_auth_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON TABLE line_auth_codes IS 'LINE連携用の一時認証コード（15分間有効）';
COMMENT ON TABLE line_notification_logs IS 'LINE通知の送信履歴（デバッグ・監査用）';
COMMENT ON COLUMN user_profiles.line_user_id IS 'LINEユーザーID（LINE Bot固有）';
COMMENT ON COLUMN user_profiles.line_linked_at IS 'LINE連携完了日時';
COMMENT ON COLUMN user_profiles.line_notification_enabled IS 'LINE通知の有効/無効設定';

