-- user_profilesテーブルにstore_nameカラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS store_name text;

-- コメントを追加
COMMENT ON COLUMN user_profiles.store_name IS '店舗名（薬局が複数店舗を運営している場合）';
