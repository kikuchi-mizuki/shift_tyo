-- 修正版のLINE通知システム（構文エラー修正版）

-- 1. 通知キューから通知を処理する修正版関数
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS TABLE(
  processed_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER
) AS $$
DECLARE
  queue_record RECORD;
  response_status INTEGER;
  response_body TEXT;
  processed INTEGER := 0;
  success INTEGER := 0;
  failed INTEGER := 0;
  auth_token TEXT;
BEGIN
  -- 認証トークンを設定
  auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
  
  -- 処理待ちの通知を取得（優先度順、作成日時順）
  FOR queue_record IN
    SELECT 
      nq.id,
      nq.user_id,
      nq.line_user_id,
      nq.notification_type,
      nq.message,
      nq.retry_count,
      nq.max_retries,
      up.name as user_name
    FROM notification_queue nq
    LEFT JOIN user_profiles up ON nq.user_id = up.id
    WHERE nq.status = 'pending'
      AND nq.retry_count < nq.max_retries
      AND nq.scheduled_at <= NOW()
    ORDER BY nq.priority ASC, nq.created_at ASC
    LIMIT 10
  LOOP
    processed := processed + 1;
    
    -- ステータスを処理中に更新
    UPDATE notification_queue 
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_record.id;
    
    -- Edge Functionを呼び出し（修正版）
    BEGIN
      SELECT status, content INTO response_status, response_body
      FROM http((
        'POST',
        'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || auth_token)
        ],
        'application/json',
        json_build_object(
          'userId', queue_record.user_id,
          'message', queue_record.message,
          'notificationType', queue_record.notification_type
        )::text
      ));

      -- 結果を更新
      IF response_status = 200 THEN
        UPDATE notification_queue 
        SET status = 'success', updated_at = NOW()
        WHERE id = queue_record.id;
        success := success + 1;
      ELSE
        -- リトライ回数を増やして再スケジュール
        UPDATE notification_queue 
        SET 
          retry_count = retry_count + 1,
          status = CASE 
            WHEN retry_count + 1 >= max_retries THEN 'failed'
            ELSE 'pending'
          END,
          error_message = 'HTTP ' || response_status || ': ' || response_body,
          scheduled_at = NOW() + INTERVAL '5 minutes' * (retry_count + 1),
          updated_at = NOW()
        WHERE id = queue_record.id;
        
        IF queue_record.retry_count + 1 >= queue_record.max_retries THEN
          failed := failed + 1;
        END IF;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- エラーが発生した場合もリトライ
        UPDATE notification_queue 
        SET 
          retry_count = retry_count + 1,
          status = CASE 
            WHEN retry_count + 1 >= max_retries THEN 'failed'
            ELSE 'pending'
          END,
          error_message = 'Exception: ' || SQLERRM,
          scheduled_at = NOW() + INTERVAL '5 minutes' * (retry_count + 1),
          updated_at = NOW()
        WHERE id = queue_record.id;
        
        IF queue_record.retry_count + 1 >= queue_record.max_retries THEN
          failed := failed + 1;
        END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT processed, success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 手動でキューを処理する関数
CREATE OR REPLACE FUNCTION send_queued_notifications()
RETURNS TEXT AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM process_notification_queue();
  
  RETURN '処理完了: 処理件数=' || result.processed_count || 
         ', 成功=' || result.success_count || 
         ', 失敗=' || result.failed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
