-- shift_postingsテーブルの店舗名を確認
SELECT
  pharmacy_id,
  store_name,
  COUNT(*) as posting_count
FROM shift_postings
WHERE pharmacy_id IS NOT NULL
  AND store_name IS NOT NULL
  AND store_name != ''
GROUP BY pharmacy_id, store_name
ORDER BY pharmacy_id, store_name;

-- 薬局ごとのユニークな店舗名リスト
SELECT
  p.pharmacy_id,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  array_agg(DISTINCT p.store_name ORDER BY p.store_name) as unique_store_names
FROM shift_postings p
LEFT JOIN user_profiles up ON p.pharmacy_id = up.id
WHERE p.pharmacy_id IS NOT NULL
  AND p.store_name IS NOT NULL
  AND p.store_name != ''
GROUP BY p.pharmacy_id, up.name, up.email
ORDER BY up.name;
