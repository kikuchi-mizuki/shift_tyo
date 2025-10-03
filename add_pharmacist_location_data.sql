-- 薬剤師プロフィールに位置情報を追加するSQL

-- 1. user_profilesテーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. 薬剤師プロフィールの現在の状況を確認
SELECT * FROM user_profiles WHERE user_type = 'pharmacist';

-- 3. 薬剤師プロフィールに位置情報を追加（例：渋谷駅周辺）
-- 注意: カラム名は実際のテーブル構造に合わせて修正してください
UPDATE user_profiles 
SET 
  nearest_station_name = '渋谷',
  nearest_station_code = 'SHB',
  location_latitude = 35.6580,
  location_longitude = 139.7016,
  max_commute_time = 60
WHERE user_type = 'pharmacist' 
  AND nearest_station_name IS NULL;

-- 4. 薬剤師プロフィールに位置情報を追加（例：新宿駅周辺）
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

-- 5. 薬剤師プロフィールに位置情報を追加（例：東京駅周辺）
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

-- 6. 更新後の確認
SELECT * FROM user_profiles WHERE user_type = 'pharmacist';

-- 6. 駅情報が存在するか確認
SELECT * FROM stations WHERE station_name IN ('渋谷', '新宿', '東京');
