/*
  # user_profilesテーブルにstore_namesカラムを追加

  1. 目的
    - 薬局が複数店舗を運営している場合の店舗名管理（配列形式）
    - 既存のstore_nameカラムから新しいstore_namesカラムへの移行

  2. 変更内容
    - user_profilesテーブルにstore_names text[]カラムを追加
    - 既存のstore_nameデータをstore_names配列に移行
*/

-- user_profilesテーブルにstore_names配列カラムを追加
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS store_names text[];

-- コメントを追加
COMMENT ON COLUMN user_profiles.store_names IS '店舗名リスト（薬局が複数店舗を運営している場合）';

-- 既存のstore_nameデータをstore_names配列に移行
UPDATE user_profiles
SET store_names = CASE
  WHEN store_name IS NOT NULL AND store_name != '' THEN ARRAY[store_name]
  ELSE ARRAY[]::text[]
END
WHERE store_names IS NULL;

-- store_nameカラムは後方互換性のために残す（今後削除する可能性あり）
COMMENT ON COLUMN user_profiles.store_name IS '（非推奨）店舗名（単一）- store_namesを使用してください';
