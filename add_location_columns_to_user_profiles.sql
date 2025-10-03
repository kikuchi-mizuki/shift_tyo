-- user_profilesテーブルに位置情報カラムを追加するSQL

-- 1. 位置情報カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS nearest_station_name TEXT,
ADD COLUMN IF NOT EXISTS nearest_station_code TEXT,
ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS max_commute_time INTEGER DEFAULT 60;

-- 2. 薬剤師プロフィールに位置情報を追加（渋谷駅周辺）
UPDATE user_profiles 
SET 
  nearest_station_name = '渋谷',
  nearest_station_code = 'SHB',
  location_latitude = 35.6580,
  location_longitude = 139.7016,
  max_commute_time = 60
WHERE user_type = 'pharmacist' 
  AND id = 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa';

-- 3. 他の薬剤師がいる場合の位置情報追加（新宿駅周辺）
UPDATE user_profiles 
SET 
  nearest_station_name = '新宿',
  nearest_station_code = 'SJK',
  location_latitude = 35.6896,
  location_longitude = 139.7006,
  max_commute_time = 45
WHERE user_type = 'pharmacist' 
  AND id != 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa'
  AND name LIKE '%2%';

-- 4. 他の薬剤師がいる場合の位置情報追加（東京駅周辺）
UPDATE user_profiles 
SET 
  nearest_station_name = '東京',
  nearest_station_code = 'TKY',
  location_latitude = 35.6812,
  location_longitude = 139.7671,
  max_commute_time = 50
WHERE user_type = 'pharmacist' 
  AND id != 'a6f376c4-1081-49cc-b188-7d5ae9cc5dfa'
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
