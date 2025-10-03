-- データベースのテーブル一覧を確認するSQL

-- 1. すべてのテーブル一覧を確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. テーブル名に「pharmacy」「store」「user」が含まれるものを確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name LIKE '%pharmacy%' 
       OR table_name LIKE '%store%' 
       OR table_name LIKE '%user%')
ORDER BY table_name;

-- 3. user_profilesテーブルの薬局データを確認
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

-- 4. 薬局に関連する可能性のあるテーブルを確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name LIKE '%shift%' 
       OR table_name LIKE '%posting%' 
       OR table_name LIKE '%request%')
ORDER BY table_name;
