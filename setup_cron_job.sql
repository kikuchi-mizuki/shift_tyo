-- LINE通知用のCron Job設定
-- このSQLはSupabaseダッシュボードのSQL Editorで実行してください

-- pg_cronエクステンションが有効になっているか確認
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のCron Jobがあれば削除
SELECT cron.unschedule('daily-shift-reminder');

-- 前日リマインダーのCron Job（毎日20:00 JST = 11:00 UTC）
-- 注: Supabaseのデータベースタイムゾーンは通常UTC
SELECT cron.schedule(
  'daily-shift-reminder',
  '0 11 * * *',  -- 毎日11:00 UTC（日本時間20:00）
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-shift-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Cron Jobの確認
SELECT * FROM cron.job WHERE jobname = 'daily-shift-reminder';

-- スケジュール実行履歴を確認（デバッグ用）
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-shift-reminder')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- コメント
COMMENT ON EXTENSION pg_cron IS 'LINE通知の前日リマインダー等の定期実行用';

