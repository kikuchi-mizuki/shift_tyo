-- テスト用の店舗情報を作成するSQL

-- 1. まず「テスト」薬局のIDを確認
SELECT 
  id,
  name,
  user_type
FROM user_profiles 
WHERE user_type = 'pharmacy' 
  AND name LIKE '%テスト%'
ORDER BY name;

-- 2. テスト薬局の店舗情報を作成
-- 注意: 上記クエリで取得したIDを使用してください
INSERT INTO store_stations (
  pharmacy_id,
  store_name,
  nearest_station_name,
  nearest_station_code,
  latitude,
  longitude
) VALUES 
-- テスト薬局のIDを実際のIDに置き換えてください
((SELECT id FROM user_profiles WHERE user_type = 'pharmacy' AND name LIKE '%テスト%' LIMIT 1), '渋谷店', '渋谷', 'SJY', 35.6598, 139.7006),
((SELECT id FROM user_profiles WHERE user_type = 'pharmacy' AND name LIKE '%テスト%' LIMIT 1), '新宿店', '新宿', 'SJK', 35.6896, 139.7006),
((SELECT id FROM user_profiles WHERE user_type = 'pharmacy' AND name LIKE '%テスト%' LIMIT 1), '池袋店', '池袋', 'IKB', 35.7295, 139.7150),
((SELECT id FROM user_profiles WHERE user_type = 'pharmacy' AND name LIKE '%テスト%' LIMIT 1), '品川店', '品川', 'SKW', 35.6284, 139.7389);

-- 3. 作成した店舗情報を確認
SELECT 
  ss.id,
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name,
  ss.nearest_station_code
FROM store_stations ss
JOIN user_profiles up ON ss.pharmacy_id = up.id
WHERE up.name LIKE '%テスト%'
ORDER BY ss.store_name;

-- 4. 全薬局の店舗情報を確認
SELECT 
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name
FROM user_profiles up
LEFT JOIN store_stations ss ON up.id = ss.pharmacy_id
WHERE up.user_type = 'pharmacy'
ORDER BY up.name, ss.store_name;
