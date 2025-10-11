-- http拡張機能の利用可能な関数を確認

-- 1. http拡張機能の関数一覧
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'http'
ORDER BY routine_name;

-- 2. http拡張機能の詳細確認
SELECT 
  extname,
  extversion,
  extowner,
  extnamespace
FROM pg_extension 
WHERE extname = 'http';

-- 3. 利用可能なスキーマを確認
SELECT 
  schema_name
FROM information_schema.schemata
WHERE schema_name IN ('http', 'net', 'public')
ORDER BY schema_name;
