-- 緊急シフト依頼送信失敗の包括的修正

-- 1. 現在の通知システムの問題を修正
-- 通知キュー処理関数の改善版
CREATE OR REPLACE FUNCTION send_queued_notifications()
RETURNS TABLE(
  processed_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  skipped_count INTEGER
) AS $$
DECLARE
  queue_record RECORD;
  response_status INTEGER;
  response_body TEXT;
  processed INTEGER := 0;
  success INTEGER := 0;
  failed INTEGER := 0;
  skipped INTEGER := 0;
  auth_token TEXT;
BEGIN
  -- 認証トークンを設定
  auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
  
  -- 処理待ちの通知を取得
  FOR queue_record IN
    SELECT 
      nq.id,
      nq.user_id,
      nq.line_user_id,
      nq.notification_type,
      nq.message,
      nq.retry_count,
      nq.max_retries,
      up.name as user_name,
      up.line_notification_enabled
    FROM notification_queue nq
    LEFT JOIN user_profiles up ON nq.user_id = up.id
    WHERE nq.status = 'pending'
      AND nq.retry_count < nq.max_retries
      AND nq.scheduled_at <= NOW()
    ORDER BY nq.priority ASC, nq.created_at ASC
    LIMIT 20  -- 一度に20件まで処理
  LOOP
    processed := processed + 1;
    
    -- ステータスを処理中に更新
    UPDATE notification_queue 
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_record.id;
    
    -- ユーザーの通知設定をチェック
    IF NOT queue_record.line_notification_enabled OR queue_record.line_user_id IS NULL THEN
      -- スキップ
      UPDATE notification_queue 
      SET 
        status = 'skipped',
        error_message = 'User notifications disabled or LINE not linked',
        updated_at = NOW()
      WHERE id = queue_record.id;
      skipped := skipped + 1;
      CONTINUE;
    END IF;
    
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
        -- エラー処理
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

  RETURN QUERY SELECT processed, success, failed, skipped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 緊急シフト通知の即座送信関数
CREATE OR REPLACE FUNCTION send_emergency_notification_immediate(
  target_user_ids UUID[],
  shift_date DATE,
  time_slot TEXT,
  store_name TEXT
)
RETURNS TABLE(
  sent_count INTEGER,
  failed_count INTEGER,
  skipped_count INTEGER,
  details JSONB
) AS $$
DECLARE
  user_record RECORD;
  sent INTEGER := 0;
  failed INTEGER := 0;
  skipped INTEGER := 0;
  details JSONB := '[]'::jsonb;
  message TEXT;
  auth_token TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- 認証トークンを設定
  auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
  
  -- メッセージを作成
  message := format('🚨 緊急シフト募集 🚨\n\n日時: %s %s\n店舗: %s\n\n詳細はアプリでご確認ください。', 
    shift_date, time_slot, store_name);
  
  -- 対象ユーザーを処理
  FOR user_record IN
    SELECT 
      id,
      name,
      line_user_id,
      line_notification_enabled
    FROM user_profiles
    WHERE id = ANY(target_user_ids)
      AND user_type = 'pharmacist'
  LOOP
    -- 通知設定をチェック
    IF NOT user_record.line_notification_enabled OR user_record.line_user_id IS NULL THEN
      skipped := skipped + 1;
      details := details || jsonb_build_object(
        'userId', user_record.id,
        'name', user_record.name,
        'status', 'skipped',
        'reason', 'LINE not linked or notifications disabled'
      );
      CONTINUE;
    END IF;
    
    -- 即座に通知を送信
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
          'userId', user_record.id,
          'message', message,
          'notificationType', 'emergency'
        )::text
      ));

      IF response_status = 200 THEN
        sent := sent + 1;
        details := details || jsonb_build_object(
          'userId', user_record.id,
          'name', user_record.name,
          'status', 'sent'
        );
      ELSE
        failed := failed + 1;
        details := details || jsonb_build_object(
          'userId', user_record.id,
          'name', user_record.name,
          'status', 'failed',
          'error', 'HTTP ' || response_status || ': ' || response_body
        );
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        failed := failed + 1;
        details := details || jsonb_build_object(
          'userId', user_record.id,
          'name', user_record.name,
          'status', 'failed',
          'error', 'Exception: ' || SQLERRM
        );
    END;
  END LOOP;

  RETURN QUERY SELECT sent, failed, skipped, details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 失敗した通知の一括再処理
CREATE OR REPLACE FUNCTION retry_all_failed_notifications()
RETURNS INTEGER AS $$
DECLARE
  retry_count INTEGER;
BEGIN
  -- 失敗した通知を再処理可能な状態に戻す
  UPDATE notification_queue 
  SET 
    status = 'pending',
    retry_count = 0,
    error_message = NULL,
    scheduled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'failed'
    AND created_at >= NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS retry_count = ROW_COUNT;
  
  -- 即座にキューを処理
  PERFORM send_queued_notifications();
  
  RETURN retry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 通知システムの状態確認関数
CREATE OR REPLACE FUNCTION get_notification_system_status()
RETURNS TABLE(
  queue_total INTEGER,
  queue_pending INTEGER,
  queue_processing INTEGER,
  queue_success INTEGER,
  queue_failed INTEGER,
  queue_skipped INTEGER,
  recent_failures INTEGER,
  last_processing TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as queue_total,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as queue_pending,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as queue_processing,
    COUNT(*) FILTER (WHERE status = 'success')::INTEGER as queue_success,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as queue_failed,
    COUNT(*) FILTER (WHERE status = 'skipped')::INTEGER as queue_skipped,
    COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '1 hour')::INTEGER as recent_failures,
    MAX(updated_at) FILTER (WHERE status IN ('success', 'failed', 'skipped')) as last_processing
  FROM notification_queue 
  WHERE created_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. コメント追加
COMMENT ON FUNCTION send_queued_notifications() IS '通知キューを処理する改善版関数';
COMMENT ON FUNCTION send_emergency_notification_immediate() IS '緊急シフト通知を即座に送信する関数';
COMMENT ON FUNCTION retry_all_failed_notifications() IS '失敗した通知を一括再処理する関数';
COMMENT ON FUNCTION get_notification_system_status() IS '通知システムの状態を確認する関数';

-- 6. 実行: 失敗した通知を再処理
SELECT retry_all_failed_notifications();

-- 7. システム状態確認
SELECT * FROM get_notification_system_status();
