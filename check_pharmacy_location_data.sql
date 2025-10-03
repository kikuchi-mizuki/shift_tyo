-- 薬局・店舗の位置情報を確認するSQL

-- 1. 薬局プロフィールの位置情報を確認
SELECT 
  id,
  name,
  user_type,
  nearest_station_name,
  nearest_station_code,
  location_latitude,
  location_longitude
FROM user_profiles 
WHERE user_type = 'pharmacy';

-- 2. データベースのテーブル一覧を確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name LIKE '%pharmacy%' 
       OR table_name LIKE '%store%' 
       OR table_name LIKE '%shift%')
ORDER BY table_name;

-- 3. 薬局に関連する可能性のあるテーブルの構造を確認
-- 注意: 実際のテーブル名に合わせて修正してください

-- 4. 薬局プロフィールに位置情報を追加（例：新宿駅周辺）
UPDATE user_profiles 
SET 
  nearest_station_name = '新宿',
  nearest_station_code = 'SJK',
  location_latitude = 35.6896,
  location_longitude = 139.7006
WHERE user_type = 'pharmacy' 
  AND nearest_station_name IS NULL;

-- 5. 薬局テーブルに位置情報を追加（例：新宿駅周辺）
-- 注意: 実際のテーブル名に合わせて修正してください
-- UPDATE pharmacies 
-- SET 
--   nearest_station_name = '新宿',
--   nearest_station_code = 'SJK',
--   location_latitude = 35.6896,
--   location_longitude = 139.7006
-- WHERE nearest_station_name IS NULL;

-- 6. 店舗テーブルに位置情報を追加（例：新宿駅周辺）
-- 注意: 実際のテーブル名に合わせて修正してください
-- UPDATE stores 
-- SET 
--   nearest_station_name = '新宿',
--   nearest_station_code = 'SJK',
--   location_latitude = 35.6896,
--   location_longitude = 139.7006
-- WHERE nearest_station_name IS NULL;

-- 7. 更新後の確認
SELECT 
  id,
  name,
  user_type,
  nearest_station_name,
  nearest_station_code,
  location_latitude,
  location_longitude
FROM user_profiles 
WHERE user_type = 'pharmacy';

-- 8. 薬局に関連する他のテーブルの確認
-- 注意: 実際のテーブル名に合わせて修正してください
