-- 薬剤師の位置情報を確認するクエリ

-- 1. 薬剤師プロフィールの位置情報
SELECT 
  user_id,
  name,
  nearest_station_name,
  nearest_station_code,
  location_latitude,
  location_longitude,
  max_commute_time,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY created_at DESC;

-- 2. 位置情報を持つ薬剤師の数
SELECT 
  COUNT(*) as total_pharmacists,
  COUNT(nearest_station_name) as with_station_name,
  COUNT(location_latitude) as with_latitude,
  COUNT(location_longitude) as with_longitude
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 3. 位置情報が完全な薬剤師
SELECT 
  user_id,
  name,
  nearest_station_name,
  location_latitude,
  location_longitude
FROM user_profiles 
WHERE user_type = 'pharmacist' 
  AND nearest_station_name IS NOT NULL 
  AND location_latitude IS NOT NULL 
  AND location_longitude IS NOT NULL;

-- 4. 駅情報の確認
SELECT 
  station_name,
  station_code,
  latitude,
  longitude
FROM stations 
LIMIT 10;
