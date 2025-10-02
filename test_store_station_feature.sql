/*
  # 店舗毎最寄駅機能のテストスクリプト

  1. 目的
    - 店舗毎の最寄駅設定機能が正常に動作することを確認
    - マッチングシステムで店舗毎の最寄駅情報が使用されることを確認

  2. テスト内容
    - 店舗駅情報の挿入・更新・削除
    - 距離計算の精度確認
    - マッチング候補の生成確認
*/

-- テスト用の薬局データを作成（既存データがある場合はスキップ）
INSERT INTO user_profiles (id, name, email, user_type, store_names)
VALUES 
  ('test-pharmacy-1', 'テスト薬局A', 'test-pharmacy-1@example.com', 'pharmacy', ARRAY['渋谷店', '新宿店', '品川店'])
ON CONFLICT (id) DO NOTHING;

-- テスト用の薬剤師データを作成
INSERT INTO user_profiles (id, name, email, user_type, nearest_station_name, nearest_station_code, max_commute_time)
VALUES 
  ('test-pharmacist-1', 'テスト薬剤師A', 'test-pharmacist-1@example.com', 'pharmacist', '新宿駅', 'JS19', 60),
  ('test-pharmacist-2', 'テスト薬剤師B', 'test-pharmacist-2@example.com', 'pharmacist', '渋谷駅', 'JS20', 45)
ON CONFLICT (id) DO NOTHING;

-- 店舗毎の最寄駅情報を挿入
INSERT INTO store_stations (pharmacy_id, store_name, nearest_station_name, nearest_station_code)
VALUES 
  ('test-pharmacy-1', '渋谷店', '渋谷駅', 'JS20'),
  ('test-pharmacy-1', '新宿店', '新宿駅', 'JS19'),
  ('test-pharmacy-1', '品川店', '品川駅', 'JS17')
ON CONFLICT (pharmacy_id, store_name) DO UPDATE SET
  nearest_station_name = EXCLUDED.nearest_station_name,
  nearest_station_code = EXCLUDED.nearest_station_code,
  updated_at = now();

-- 駅情報から座標を自動取得するトリガーが動作することを確認
SELECT 
  ss.pharmacy_id,
  ss.store_name,
  ss.nearest_station_name,
  ss.nearest_station_code,
  ss.latitude,
  ss.longitude,
  s.latitude as station_latitude,
  s.longitude as station_longitude
FROM store_stations ss
LEFT JOIN stations s ON s.station_name = ss.nearest_station_name
WHERE ss.pharmacy_id = 'test-pharmacy-1';

-- 距離計算関数のテスト
SELECT 
  calculate_distance(35.6896, 139.6917, 35.6580, 139.7016) as distance_km,
  estimate_commute_time(calculate_distance(35.6896, 139.6917, 35.6580, 139.7016)) as commute_time_min;

-- 最寄駅検索関数のテスト
SELECT * FROM find_nearby_stations(35.6896, 139.6917, 10);

-- 店舗駅情報の取得テスト
SELECT 
  ss.*,
  s.latitude as station_lat,
  s.longitude as station_lon
FROM store_stations ss
LEFT JOIN stations s ON s.station_name = ss.nearest_station_name
WHERE ss.pharmacy_id = 'test-pharmacy-1'
ORDER BY ss.store_name;

-- マッチング候補生成のテスト（薬剤師と店舗の距離計算）
WITH pharmacist_locations AS (
  SELECT 
    up.id,
    up.nearest_station_name,
    s.latitude,
    s.longitude,
    up.max_commute_time
  FROM user_profiles up
  LEFT JOIN stations s ON s.station_name = up.nearest_station_name
  WHERE up.user_type = 'pharmacist' 
    AND up.id IN ('test-pharmacist-1', 'test-pharmacist-2')
),
store_locations AS (
  SELECT 
    ss.pharmacy_id,
    ss.store_name,
    ss.nearest_station_name,
    s.latitude,
    s.longitude
  FROM store_stations ss
  LEFT JOIN stations s ON s.station_name = ss.nearest_station_name
  WHERE ss.pharmacy_id = 'test-pharmacy-1'
)
SELECT 
  pl.id as pharmacist_id,
  pl.nearest_station_name as pharmacist_station,
  sl.store_name,
  sl.nearest_station_name as store_station,
  calculate_distance(pl.latitude, pl.longitude, sl.latitude, sl.longitude) as distance_km,
  estimate_commute_time(calculate_distance(pl.latitude, pl.longitude, sl.latitude, sl.longitude)) as commute_time_min,
  pl.max_commute_time,
  CASE 
    WHEN estimate_commute_time(calculate_distance(pl.latitude, pl.longitude, sl.latitude, sl.longitude)) <= pl.max_commute_time 
    THEN 'MATCH'
    ELSE 'NO_MATCH'
  END as match_status
FROM pharmacist_locations pl
CROSS JOIN store_locations sl
ORDER BY distance_km;

-- テストデータのクリーンアップ（必要に応じて実行）
-- DELETE FROM store_stations WHERE pharmacy_id = 'test-pharmacy-1';
-- DELETE FROM user_profiles WHERE id IN ('test-pharmacy-1', 'test-pharmacist-1', 'test-pharmacist-2');
