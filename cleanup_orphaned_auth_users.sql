-- 孤立したauth.usersを検出
-- user_profilesに存在しないauth.usersを見つける

SELECT 
  au.id,
  au.email,
  au.created_at,
  au.deleted_at,
  CASE 
    WHEN up.id IS NULL THEN '孤立（削除対象）'
    ELSE '正常'
  END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- 孤立したユーザー数を確認
SELECT 
  COUNT(*) as orphaned_users_count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;
