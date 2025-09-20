-- テストデータをクリーンアップするSQL
-- このファイルを実行して、自動挿入されたテストデータを削除できます

-- テスト用のユーザープロファイルを削除
DELETE FROM user_profiles WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004'
);

-- テスト用のシフトリクエストを削除
DELETE FROM shift_requests WHERE pharmacist_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002'
);

-- テスト用のシフトポスティングを削除
DELETE FROM shift_postings WHERE pharmacy_id IN (
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004'
);

-- 確認クエリ
SELECT 'Remaining shift_requests:' as table_name, COUNT(*) as count FROM shift_requests
UNION ALL
SELECT 'Remaining shift_postings:' as table_name, COUNT(*) as count FROM shift_postings
UNION ALL
SELECT 'Remaining user_profiles:' as table_name, COUNT(*) as count FROM user_profiles;
