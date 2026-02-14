-- データが正しく取得できるか確認
-- Supabase Dashboard > SQL Editor で実行

-- 1. 作成されたポリシーを確認
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;

-- 2. shift_requestsの全データ件数
SELECT COUNT(*) as total_shift_requests FROM shift_requests;

-- 3. 3月のデータ件数
SELECT COUNT(*) as march_requests
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01';

-- 4. 3月2日のデータを詳細表示
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  created_at
FROM shift_requests
WHERE date = '2026-03-02'
ORDER BY created_at
LIMIT 10;

-- 5. 日付ごとのデータ件数（3月のみ）
SELECT
  date,
  COUNT(*) as count
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01'
GROUP BY date
ORDER BY date;
