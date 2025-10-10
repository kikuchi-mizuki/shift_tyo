-- 一時的にRLSを無効化（テスト用）
-- 注意: 本番環境では慎重に使用してください

ALTER TABLE line_auth_codes DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'line_auth_codes';