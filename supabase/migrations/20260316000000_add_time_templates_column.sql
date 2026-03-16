/*
  # 定型時間テンプレート機能のためのデータベーススキーマ拡張

  1. 目的
    - 薬剤師と薬局の定型時間テンプレートをデータベースに保存
    - デバイス間でのデータ同期を実現
    - localStorageからデータベースへの移行

  2. 変更内容
    - user_profilesテーブルにtime_templatesカラムを追加（JSONB型）
*/

-- user_profilesテーブルに定型時間テンプレートカラムを追加
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS time_templates jsonb DEFAULT '[]'::jsonb;

-- コメントを追加
COMMENT ON COLUMN user_profiles.time_templates IS '定型時間テンプレート（JSON配列）';

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_user_profiles_time_templates ON user_profiles USING GIN (time_templates);
