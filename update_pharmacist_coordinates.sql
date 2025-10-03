-- 薬剤師の位置情報（緯度・経度）を更新するSQL

-- 1. 現在の薬剤師プロフィールを確認
SELECT 
  id,
  name,
  user_type,
  nearest_station_name,
  nearest_station_code,
  location_latitude,
  location_longitude,
  max_commute_time
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 2. 薬剤師の位置情報を更新（渋谷駅の正確な座標）
UPDATE user_profiles 
SET 
  nearest_station_code = 'SHB',
  location_latitude = 35.6580,
  location_longitude = 139.7016
WHERE user_type = 'pharmacist' 
  AND nearest_station_name = '渋谷';

-- 3. 他の薬剤師がいる場合の位置情報更新（新宿駅）
UPDATE user_profiles 
SET 
  nearest_station_name = '新宿',
  nearest_station_code = 'SJK',
  location_latitude = 35.6896,
  location_longitude = 139.7006,
  max_commute_time = 45
WHERE user_type = 'pharmacist' 
  AND nearest_station_name IS NULL
  AND name LIKE '%2%';

-- 4. 他の薬剤師がいる場合の位置情報更新（東京駅）
UPDATE user_profiles 
SET 
  nearest_station_name = '東京',
  nearest_station_code = 'TKY',
  location_latitude = 35.6812,
  location_longitude = 139.7671,
  max_commute_time = 50
WHERE user_type = 'pharmacist' 
  AND nearest_station_name IS NULL
  AND name LIKE '%3%';

-- 5. 更新後の確認
SELECT 
  id,
  name,
  user_type,
  nearest_station_name,
  nearest_station_code,
  location_latitude,
  location_longitude,
  max_commute_time
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 6. 駅情報が存在するか確認
SELECT * FROM stations WHERE station_name IN ('渋谷', '新宿', '東京');
