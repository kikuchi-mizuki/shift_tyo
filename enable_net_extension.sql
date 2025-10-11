-- Supabaseのnet拡張機能を有効化してLINE通知を送信可能にする

-- 1. net拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS http;

-- 2. 拡張機能の状態を確認
SELECT 
  extname,
  extversion,
  extowner,
  extnamespace
FROM pg_extension 
WHERE extname IN ('http', 'net');

-- 3. 利用可能な関数を確認
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'http'
ORDER BY routine_name;
