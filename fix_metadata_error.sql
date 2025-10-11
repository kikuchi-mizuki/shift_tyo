-- メタデータエラーを修正したバージョン

-- 1. notification_queueテーブルにmetadataカラムを追加（存在しない場合）
ALTER TABLE notification_queue 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. 現在のキューに新しいトークンを設定
UPDATE notification_queue 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{auth_token}', 
  '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE"'
)
WHERE status = 'pending';

-- 3. 関数内のトークンも更新
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
  -- 新しい認証トークンを設定
  auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
  
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
    
    -- Edge Functionを呼び出し
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
