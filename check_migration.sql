-- マイグレーション実行後の確認クエリ

-- 1. テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'match_outcomes', 
  'learning_data', 
  'pharmacist_profiles', 
  'pharmacy_profiles', 
  'matching_history'
);

-- 2. データの確認
SELECT 
  'match_outcomes' as table_name, 
  COUNT(*) as record_count 
FROM match_outcomes
UNION ALL
SELECT 
  'learning_data' as table_name, 
  COUNT(*) as record_count 
FROM learning_data
UNION ALL
SELECT 
  'pharmacist_profiles' as table_name, 
  COUNT(*) as record_count 
FROM pharmacist_profiles
UNION ALL
SELECT 
  'pharmacy_profiles' as table_name, 
  COUNT(*) as record_count 
FROM pharmacy_profiles
UNION ALL
SELECT 
  'matching_history' as table_name, 
  COUNT(*) as record_count 
FROM matching_history;

-- 3. インデックスの確認
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN (
  'match_outcomes', 
  'learning_data', 
  'pharmacist_profiles', 
  'pharmacy_profiles', 
  'matching_history'
)
ORDER BY tablename, indexname;

-- 4. RLSポリシーの確認
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
WHERE tablename IN (
  'match_outcomes', 
  'learning_data', 
  'pharmacist_profiles', 
  'pharmacy_profiles', 
  'matching_history'
)
ORDER BY tablename, policyname;
