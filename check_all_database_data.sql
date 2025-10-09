-- 緊急シフト募集フォームで読み取っている全データベースを確認するSQL

-- 1. 薬局情報の確認
SELECT 
  '薬局情報' as data_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as names
FROM user_profiles 
WHERE user_type = 'pharmacy';

-- 2. 薬剤師情報の確認
SELECT 
  '薬剤師情報' as data_type,
  COUNT(*) as total_count,
  COUNT(line_user_id) as line_linked_count,
  STRING_AGG(name, ', ') as names
FROM user_profiles 
WHERE user_type = 'pharmacist';

-- 3. 店舗情報の確認
SELECT 
  '店舗情報' as data_type,
  COUNT(*) as count,
  STRING_AGG(store_name, ', ') as store_names
FROM store_stations;

-- 4. 詳細な薬局情報
SELECT 
  '薬局詳細' as data_type,
  id,
  name,
  email,
  line_user_id,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY name;

-- 5. 詳細な薬剤師情報
SELECT 
  '薬剤師詳細' as data_type,
  id,
  name,
  email,
  line_user_id,
  nearest_station_name,
  line_notification_enabled
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- 6. 詳細な店舗情報
SELECT 
  '店舗詳細' as data_type,
  ss.id,
  up.name as pharmacy_name,
  ss.store_name,
  ss.nearest_station_name,
  ss.nearest_station_code
FROM store_stations ss
JOIN user_profiles up ON ss.pharmacy_id = up.id
ORDER BY up.name, ss.store_name;
