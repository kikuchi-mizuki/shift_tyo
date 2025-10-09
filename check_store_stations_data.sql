-- 店舗情報のデータベース連携を確認するSQL

-- 1. store_stationsテーブルの存在確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name = 'store_stations';

-- 2. store_stationsテーブルの構造確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'store_stations'
ORDER BY ordinal_position;

-- 3. store_stationsテーブルのデータ確認
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

-- 4. 薬局情報と店舗情報の結合確認
SELECT 
  up.id as pharmacy_id,
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name,
  ss.nearest_station_code
FROM user_profiles up
LEFT JOIN store_stations ss ON up.id = ss.pharmacy_id
WHERE up.user_type = 'pharmacy'
ORDER BY up.name, ss.store_name;

-- 5. 店舗情報がない薬局の確認
SELECT 
  up.id,
  up.name as pharmacy_name,
  up.nearest_station_name
FROM user_profiles up
WHERE up.user_type = 'pharmacy'
  AND up.id NOT IN (SELECT DISTINCT pharmacy_id FROM store_stations)
ORDER BY up.name;
