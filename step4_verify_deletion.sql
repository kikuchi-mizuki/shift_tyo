-- ステップ4: 削除後の確認
SELECT COUNT(*) as remaining_count
FROM shift_postings;

-- 残っている募集データの確認（店舗名別）
SELECT 
  store_name,
  COUNT(*) as count
FROM shift_postings
GROUP BY store_name
ORDER BY store_name;
