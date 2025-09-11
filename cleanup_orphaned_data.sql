-- 薬局未設定のデータをクリーンアップするSQL（修正版）

-- 1. まず、現在の状況を確認
SELECT 'user_profiles' as table_name, COUNT(*) as total_count FROM user_profiles;
SELECT 'user_profiles with null names' as description, COUNT(*) as count FROM user_profiles WHERE name IS NULL OR name = '';
SELECT 'user_profiles with empty names' as description, COUNT(*) as count FROM user_profiles WHERE name = '';

-- 2. NGリストに含まれているが、実際には存在しない薬局IDを確認
WITH orphaned_ids AS (
  SELECT DISTINCT unnest(ng_list) as orphaned_pharmacy_id
  FROM user_profiles 
  WHERE ng_list IS NOT NULL 
    AND array_length(ng_list, 1) > 0
)
SELECT orphaned_pharmacy_id
FROM orphaned_ids
WHERE orphaned_pharmacy_id::uuid NOT IN (SELECT id FROM user_profiles);

-- 3. 存在しない薬局IDをNGリストから削除
WITH orphaned_data AS (
  SELECT id as user_id, unnest(ng_list) as unnest_pharmacy_id
  FROM user_profiles 
  WHERE ng_list IS NOT NULL 
    AND array_length(ng_list, 1) > 0
)
UPDATE user_profiles 
SET ng_list = array_remove(ng_list, orphaned_data.unnest_pharmacy_id)
FROM orphaned_data
WHERE user_profiles.id = orphaned_data.user_id
  AND orphaned_data.unnest_pharmacy_id::uuid NOT IN (SELECT id FROM user_profiles);

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
