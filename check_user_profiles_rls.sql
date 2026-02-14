-- Check if user_profiles has RLS enabled and what policies exist
-- Execute this in Supabase Dashboard SQL Editor

-- Check RLS status on user_profiles
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- Check policies on user_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
