-- store_stationsテーブルの詳細データを確認するSQL

-- 1. store_stationsテーブルの全データ
SELECT 
  id,
  pharmacy_id,
  store_name,
  nearest_station_name,
  nearest_station_code,
  latitude,
  longitude,
  created_at
FROM store_stations
ORDER BY pharmacy_id, store_name;

-- 2. 薬局IDと薬局名の対応確認
SELECT 
  ss.pharmacy_id,
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name
FROM store_stations ss
LEFT JOIN user_profiles up ON ss.pharmacy_id = up.id
ORDER BY up.name, ss.store_name;

-- 3. 薬局IDが存在しない店舗データの確認
SELECT 
  ss.*
FROM store_stations ss
LEFT JOIN user_profiles up ON ss.pharmacy_id = up.id
WHERE up.id IS NULL;

-- 4. 薬局名に「テスト」が含まれる薬局のID確認
SELECT 
  id,
  name,
  user_type
FROM user_profiles 
WHERE user_type = 'pharmacy' 
  AND name LIKE '%テスト%';

-- 5. 「テスト」薬局の店舗データ確認
SELECT 
  ss.id,
  ss.pharmacy_id,
  ss.store_name,
  ss.nearest_station_name,
  up.name as pharmacy_name
FROM store_stations ss
JOIN user_profiles up ON ss.pharmacy_id = up.id
WHERE up.name LIKE '%テスト%';
