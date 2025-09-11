-- 薬局未設定のデータをクリーンアップするSQL

-- 1. まず、現在の状況を確認
SELECT 'user_profiles' as table_name, COUNT(*) as total_count FROM user_profiles;
SELECT 'user_profiles with null names' as description, COUNT(*) as count FROM user_profiles WHERE name IS NULL OR name = '';
SELECT 'user_profiles with empty names' as description, COUNT(*) as count FROM user_profiles WHERE name = '';

-- 2. NGリストに含まれているが、実際には存在しない薬局IDを確認
SELECT DISTINCT unnest(ng_list) as orphaned_pharmacy_id
FROM user_profiles 
WHERE ng_list IS NOT NULL 
  AND array_length(ng_list, 1) > 0
  AND unnest(ng_list) NOT IN (SELECT id FROM user_profiles);

-- 3. 存在しない薬局IDをNGリストから削除
UPDATE user_profiles 
SET ng_list = array_remove(ng_list, unnest_pharmacy_id)
FROM (
  SELECT id as user_id, unnest(ng_list) as unnest_pharmacy_id
  FROM user_profiles 
  WHERE ng_list IS NOT NULL 
    AND array_length(ng_list, 1) > 0
    AND unnest(ng_list) NOT IN (SELECT id FROM user_profiles)
) as orphaned_data
WHERE user_profiles.id = orphaned_data.user_id;

-- 4. 空のNGリストをNULLに設定
UPDATE user_profiles 
SET ng_list = NULL 
WHERE ng_list IS NOT NULL 
  AND array_length(ng_list, 1) = 0;

-- 5. 名前が空またはNULLのユーザーを削除（テストデータなど）
DELETE FROM user_profiles 
WHERE name IS NULL 
   OR name = '' 
   OR name = 'undefined'
   OR email IS NULL 
   OR email = '';

-- 6. 最終確認
SELECT 'After cleanup - user_profiles' as table_name, COUNT(*) as total_count FROM user_profiles;
SELECT 'After cleanup - users with ng_list' as description, COUNT(*) as count FROM user_profiles WHERE ng_list IS NOT NULL AND array_length(ng_list, 1) > 0;
