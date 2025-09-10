-- shift_postingsテーブルにstore_nameカラムを追加
ALTER TABLE shift_postings ADD COLUMN IF NOT EXISTS store_name text;

-- 既存のデータでmemoに[store:店舗名]が含まれている場合は抽出してstore_nameに設定
UPDATE shift_postings 
SET store_name = (
  SELECT regexp_replace(memo, '.*\[store:([^\]]+)\].*', '\1', 'g')
  WHERE memo ~ '\[store:[^\]]+\]'
)
WHERE memo ~ '\[store:[^\]]+\]' AND store_name IS NULL;

-- コメントを追加
COMMENT ON COLUMN shift_postings.store_name IS '店舗名（薬局が複数店舗を運営している場合）';
