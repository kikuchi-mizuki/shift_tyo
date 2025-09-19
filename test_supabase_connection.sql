-- Supabase接続テスト用のSQL
-- このクエリをSupabaseダッシュボードのSQL Editorで実行してください

-- 1. テーブル存在確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shift_requests', 'shift_postings', 'user_profiles');

-- 2. shift_requestsテーブルの構造確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shift_requests' 
ORDER BY ordinal_position;

-- 3. テストデータの確認
SELECT COUNT(*) as shift_requests_count FROM shift_requests;
SELECT COUNT(*) as shift_postings_count FROM shift_postings;
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- 4. 9月のテストデータ確認
SELECT * FROM shift_requests WHERE date >= '2025-09-01' AND date < '2025-10-01';
SELECT * FROM shift_postings WHERE date >= '2025-09-01' AND date < '2025-10-01';

-- 5. user_profilesのテストデータ確認
SELECT * FROM user_profiles WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004'
);

