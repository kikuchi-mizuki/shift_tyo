-- 3月2日のshift_requestsデータを確認
SELECT
  COUNT(*) as total_count,
  '3月2日のデータ件数' as description
FROM shift_requests
WHERE date = '2026-03-02';

-- 詳細データ
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  status,
  created_at
FROM shift_requests
WHERE date = '2026-03-02'
ORDER BY created_at;

-- 3月の全データ件数
SELECT
  COUNT(*) as march_total,
  '3月全体のデータ件数' as description
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01';

-- 日付ごとの件数
SELECT
  date,
  COUNT(*) as count
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01'
GROUP BY date
ORDER BY date;
