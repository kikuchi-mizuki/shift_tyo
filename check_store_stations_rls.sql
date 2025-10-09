-- store_stationsテーブルのRLSポリシーを確認・修正するSQL

-- 1. 現在のRLSポリシーを確認
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
WHERE tablename = 'store_stations';

-- 2. RLSが有効かどうか確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'store_stations';

-- 3. store_stationsテーブルに適切なRLSポリシーを作成
-- すべてのユーザーが読み取り可能にする
DROP POLICY IF EXISTS "store_stations_read_policy" ON store_stations;

CREATE POLICY "store_stations_read_policy" ON store_stations
  FOR SELECT
  USING (true);

-- 4. ポリシーの作成結果を確認
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
WHERE tablename = 'store_stations';
