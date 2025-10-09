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
      url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/daily-shift-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
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

