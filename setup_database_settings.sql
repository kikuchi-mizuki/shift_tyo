-- データベース設定の追加
-- このSQLはSupabaseダッシュボードのSQL Editorで実行してください

-- Supabase URLとAnon Keyを設定に保存
-- これによりDatabase TriggerやCron JobからEdge Functionを呼び出せるようになります

-- 注意: 以下の値を実際の値に置き換えてください
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_ID.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'YOUR_SUPABASE_ANON_KEY_HERE';

-- 設定の確認
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings%';

-- 設定を有効化するためにセッションをリロード
SELECT pg_reload_conf();

-- テスト: Database Triggerから設定を読み取れるか確認
DO $$
BEGIN
  RAISE NOTICE 'Supabase URL: %', current_setting('app.settings.supabase_url');
  RAISE NOTICE 'Supabase Anon Key (first 20 chars): %', 
    substring(current_setting('app.settings.supabase_anon_key'), 1, 20);
END $$;

