-- Test is_admin() function
-- Execute this in Supabase Dashboard SQL Editor

-- First, re-enable RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- Test is_admin() function directly
-- This will use your current logged-in session in Supabase Dashboard
SELECT
  auth.uid() as current_user_id,
  is_admin() as is_admin_result,
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) as user_type_direct;

-- Test the full policy condition
SELECT
  auth.uid() as current_user_id,
  pharmacist_id,
  (pharmacist_id = auth.uid()) as matches_pharmacist_id,
  is_admin() as is_admin_result,
  ((pharmacist_id = auth.uid()) OR is_admin()) as policy_result
FROM shift_requests
WHERE date::text LIKE '2026-03-02%'
LIMIT 5;
