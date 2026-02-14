-- Check current RLS policies on shift_requests table
-- Execute this in Supabase Dashboard SQL Editor

-- 1. Show all policies on shift_requests
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
WHERE tablename = 'shift_requests'
ORDER BY policyname;

-- 2. Test the policy with your user ID
-- Replace 'YOUR_USER_ID' with: 0e665ba6-06ae-48eb-be73-eba61d72d6b3
DO $$
DECLARE
  test_user_id uuid := '0e665ba6-06ae-48eb-be73-eba61d72d6b3';
  user_type_result text;
BEGIN
  -- Check what user_type the policy sees
  SELECT user_type INTO user_type_result
  FROM user_profiles
  WHERE id = test_user_id
  LIMIT 1;

  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'User Type from user_profiles: %', user_type_result;
END $$;

-- 3. Check if RLS is enabled on shift_requests
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'shift_requests';
