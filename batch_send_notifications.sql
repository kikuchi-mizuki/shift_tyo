-- バッチ処理でLINE通知を自動送信する関数

-- 1. 送信待ちの通知を処理する関数を作成
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS TABLE(
  processed_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER
) AS $$
DECLARE
  notification_record RECORD;
  response_status INTEGER;
  response_body TEXT;
  processed INTEGER := 0;
  success INTEGER := 0;
  failed INTEGER := 0;
BEGIN
  -- 送信待ちの通知を取得
  FOR notification_record IN
    SELECT 
      lnl.id,
      lnl.user_id,
      lnl.line_user_id,
      lnl.message,
      up.name as user_name
    FROM line_notification_logs lnl
    LEFT JOIN user_profiles up ON lnl.user_id = up.id
    WHERE lnl.status = 'ready_to_send'
      AND lnl.notification_type = 'shift_confirmed'
      AND lnl.sent_at >= NOW() - INTERVAL '1 hour'  -- 1時間以内の通知のみ処理
    ORDER BY lnl.sent_at ASC
    LIMIT 10  -- 一度に10件まで処理
  LOOP
    processed := processed + 1;
    
    -- ステータスをattemptingに更新
    UPDATE line_notification_logs 
    SET status = 'attempting'
    WHERE id = notification_record.id;
    
    -- Edge Functionを呼び出し
    BEGIN
      SELECT status, content INTO response_status, response_body
      FROM http((
        'POST',
        'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE')
        ],
        'application/json',
        json_build_object(
          'userId', notification_record.user_id,
          'message', notification_record.message,
          'notificationType', 'shift_confirmed'
        )::text
      ));

      -- 結果を更新
      IF response_status = 200 THEN
        UPDATE line_notification_logs 
        SET status = 'success', error_message = NULL
        WHERE id = notification_record.id;
        success := success + 1;
      ELSE
        UPDATE line_notification_logs 
        SET status = 'failed', error_message = 'HTTP ' || response_status || ': ' || response_body
        WHERE id = notification_record.id;
        failed := failed + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        UPDATE line_notification_logs 
        SET status = 'failed', error_message = 'Exception: ' || SQLERRM
        WHERE id = notification_record.id;
        failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT processed, success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 手動でバッチ処理を実行する関数
CREATE OR REPLACE FUNCTION send_pending_notifications()
RETURNS TEXT AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM process_pending_notifications();
  
  RETURN '処理完了: 処理件数=' || result.processed_count || 
         ', 成功=' || result.success_count || 
         ', 失敗=' || result.failed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. コメント追加
COMMENT ON FUNCTION process_pending_notifications() IS '送信待ちのLINE通知をバッチ処理で送信する関数';
COMMENT ON FUNCTION send_pending_notifications() IS '手動で送信待ちのLINE通知を送信する関数';
