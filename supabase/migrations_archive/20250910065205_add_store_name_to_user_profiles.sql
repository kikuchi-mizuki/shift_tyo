/*
  # user_profilesテーブルにstore_nameカラムを追加

  1. 目的
    - 薬局が複数店舗を運営している場合の店舗名管理
    - シフト募集時に店舗名を指定可能にする

  2. 変更内容
    - user_profilesテーブルにstore_nameカラムを追加
    - 既存データにはNULLを設定
*/

-- user_profilesテーブルにstore_nameカラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS store_name text;

-- コメントを追加
COMMENT ON COLUMN user_profiles.store_name IS '店舗名（薬局が複数店舗を運営している場合）';
