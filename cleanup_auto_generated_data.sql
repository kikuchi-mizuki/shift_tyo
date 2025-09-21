-- 自動生成されたデータをクリーンアップするSQL
-- このファイルをSupabaseのSQLエディタで実行してください

-- 1. 自動生成された薬剤師プロファイルを削除
DELETE FROM pharmacist_profiles 
WHERE user_id IN (
  SELECT id FROM user_profiles 
  WHERE user_type = 'pharmacist'
);

-- 2. 自動生成された薬局プロファイルを削除
DELETE FROM pharmacy_profiles 
WHERE user_id IN (
  SELECT id FROM user_profiles 
  WHERE user_type = 'pharmacy'
);

-- 3. 自動生成されたマッチング結果を削除
DELETE FROM match_outcomes 
WHERE feedback = 'AIマッチングシステムによる自動生成データ';

-- 4. 自動生成された学習データを削除
DELETE FROM learning_data 
WHERE metadata->>'source' = 'historical_data';

-- 5. 自動生成されたマッチング履歴を削除
DELETE FROM matching_history 
WHERE metadata->>'notes' = 'Historical matching data';

-- 確認用クエリ（実行後にデータが削除されたか確認）
SELECT 'pharmacist_profiles' as table_name, COUNT(*) as count FROM pharmacist_profiles
UNION ALL
SELECT 'pharmacy_profiles', COUNT(*) FROM pharmacy_profiles
UNION ALL
SELECT 'match_outcomes', COUNT(*) FROM match_outcomes
UNION ALL
SELECT 'learning_data', COUNT(*) FROM learning_data
UNION ALL
SELECT 'matching_history', COUNT(*) FROM matching_history;
