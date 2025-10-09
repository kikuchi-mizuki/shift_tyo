-- 即座にテスト用店舗データを作成するSQL

-- 1. まず「テスト」薬局のIDを確認
SELECT 
  id,
  name,
  user_type
FROM user_profiles 
WHERE user_type = 'pharmacy' 
  AND name = 'テスト';

-- 2. テスト薬局の店舗情報を作成（ID: 2dfd7305-02c0-417c-a167-bdcecf2c87e9）
INSERT INTO store_stations (
  pharmacy_id,
  store_name,
  nearest_station_name,
  nearest_station_code,
  latitude,
  longitude
) VALUES 
('2dfd7305-02c0-417c-a167-bdcecf2c87e9', '渋谷店', '渋谷', 'SJY', 35.6598, 139.7006),
('2dfd7305-02c0-417c-a167-bdcecf2c87e9', '新宿店', '新宿', 'SJK', 35.6896, 139.7006),
('2dfd7305-02c0-417c-a167-bdcecf2c87e9', '池袋店', '池袋', 'IKB', 35.7295, 139.7150),
('2dfd7305-02c0-417c-a167-bdcecf2c87e9', '品川店', '品川', 'SKW', 35.6284, 139.7389)
ON CONFLICT (pharmacy_id, store_name) DO UPDATE SET
  nearest_station_name = EXCLUDED.nearest_station_name,
  nearest_station_code = EXCLUDED.nearest_station_code,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

-- 3. 作成結果を確認
SELECT 
  ss.id,
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name,
  ss.nearest_station_code
FROM store_stations ss
JOIN user_profiles up ON ss.pharmacy_id = up.id
WHERE up.name = 'テスト'
ORDER BY ss.store_name;

-- 4. 全店舗データの確認
SELECT COUNT(*) as total_stores FROM store_stations;
