-- どのデータベースに接続しているか確認
-- Supabase Dashboard > SQL Editor で実行

-- 1. データベースの基本情報
SELECT
  current_database() as database_name,
  current_user as current_user,
  inet_server_addr() as server_ip,
  version() as postgres_version;

-- 2. 3月2日のデータを詳細表示
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  memo,
  created_at
FROM shift_requests
WHERE date = '2026-03-02'
ORDER BY created_at;

-- 3. 3月2日のデータのpharmacist_idリスト
SELECT
  DISTINCT pharmacist_id,
  COUNT(*) as count
FROM shift_requests
WHERE date = '2026-03-02'
GROUP BY pharmacist_id
ORDER BY count DESC;

-- 4. shift_requestsテーブルの統計情報
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as unique_dates,
  COUNT(DISTINCT pharmacist_id) as unique_pharmacists,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM shift_requests;

-- 5. このデータベースのURL（確認用）
-- 注意: この結果をアプリケーションの.envファイルと比較してください
SELECT
  'プロジェクトURL: ' || current_setting('app.settings.api_url', true) as info
WHERE current_setting('app.settings.api_url', true) IS NOT NULL
UNION ALL
SELECT 'データベース名: ' || current_database();
