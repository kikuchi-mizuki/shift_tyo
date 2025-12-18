-- shift_postingsテーブルから店舗名を取得してuser_profilesに設定

-- Step 1: 各薬局のユニークな店舗名を集計してuser_profilesに反映
UPDATE user_profiles up
SET store_names = subquery.unique_stores
FROM (
  SELECT
    pharmacy_id,
    array_agg(DISTINCT store_name ORDER BY store_name) as unique_stores
  FROM shift_postings
  WHERE pharmacy_id IS NOT NULL
    AND store_name IS NOT NULL
    AND store_name != ''
  GROUP BY pharmacy_id
) AS subquery
WHERE up.id = subquery.pharmacy_id
  AND up.user_type = 'pharmacy';

-- Step 2: 確認クエリ - 更新された店舗名を表示
SELECT
  up.name,
  up.email,
  up.store_names,
  array_to_string(up.store_names, ', ') as store_names_list,
  array_length(up.store_names, 1) as store_count
FROM user_profiles up
WHERE up.user_type = 'pharmacy'
ORDER BY up.name;
