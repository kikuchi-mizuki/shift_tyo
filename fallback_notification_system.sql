-- フォールバック機能付きのLINE通知システム

-- 1. 通知キューシステムの作成
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  line_user_id TEXT,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 1, -- 1: 高, 2: 中, 3: 低
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, processing, success, failed
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 通知キューに追加する関数
CREATE OR REPLACE FUNCTION add_to_notification_queue(
  p_user_id UUID,
  p_line_user_id TEXT,
  p_notification_type TEXT,
  p_message TEXT,
  p_priority INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO notification_queue (
    user_id,
    line_user_id,
    notification_type,
    message,
    priority
  ) VALUES (
    p_user_id,
    p_line_user_id,
    p_notification_type,
    p_message,
    p_priority
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. キューから通知を処理する関数
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
    LIMIT 10  -- 一度に10件まで処理
  LOOP
    processed := processed + 1;
    
    -- ステータスを処理中に更新
    UPDATE notification_queue 
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_record.id;
    
    -- 認証トークンを取得
    auth_token := current_setting('app.settings.supabase_anon_key', true);
    IF auth_token IS NULL OR auth_token = '' THEN
      auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
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
          scheduled_at = NOW() + INTERVAL '5 minutes' * (retry_count + 1), -- 指数バックオフ
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

-- 4. 手動でキューを処理する関数
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

-- 5. キューシステムを使用する修正版トリガー関数
CREATE OR REPLACE FUNCTION notify_shift_confirmed_with_queue()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  formatted_date TEXT;
  queue_id UUID;
BEGIN
  -- デバッグログ: トリガー開始
  INSERT INTO line_notification_logs (
    user_id,
    notification_type,
    message,
    status,
    sent_at
  ) VALUES (
    NEW.pharmacist_id,
    'debug',
    'トリガー関数開始: シフトID=' || NEW.id || ', ステータス=' || NEW.status || ', 薬剤師ID=' || NEW.pharmacist_id,
    'success',
    NOW()
  );

  -- 確定済みシフトのみ処理
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- 薬剤師情報を取得
  SELECT id, name, email, line_user_id, line_notification_enabled
  INTO pharmacist_record
  FROM user_profiles
  WHERE id = NEW.pharmacist_id;

  -- 薬局情報を取得
  SELECT id, name, email, line_user_id, line_notification_enabled
  INTO pharmacy_record
  FROM user_profiles
  WHERE id = NEW.pharmacy_id;

  -- 日付をフォーマット
  formatted_date := TO_CHAR(NEW.date, 'MM月DD日');

  -- 時間情報をフォーマット
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    time_info := TO_CHAR(NEW.start_time, 'HH24:MI') || '〜' || TO_CHAR(NEW.end_time, 'HH24:MI');
  ELSE
    time_info := CASE NEW.time_slot
      WHEN 'morning' THEN '午前'
      WHEN 'afternoon' THEN '午後'
      WHEN 'fullday' THEN '終日'
      WHEN 'negotiable' THEN '要相談'
      ELSE NEW.time_slot
    END;
  END IF;

  -- 薬剤師向けメッセージ
  pharmacist_message := '【シフト確定のお知らせ】' || E'\n\n' ||
                        '日時: ' || formatted_date || E'\n' ||
                        '時間: ' || time_info || E'\n' ||
                        '店舗: ' || COALESCE(NEW.store_name, pharmacy_record.name, '未設定') || E'\n';
  
  IF NEW.memo IS NOT NULL THEN
    pharmacist_message := pharmacist_message || E'\nメモ: ' || NEW.memo || E'\n';
  END IF;

  pharmacist_message := pharmacist_message || E'\nよろしくお願いします！';

  -- 薬剤師にLINE通知をキューに追加
  IF pharmacist_record.line_user_id IS NOT NULL AND pharmacist_record.line_notification_enabled THEN
    SELECT add_to_notification_queue(
      NEW.pharmacist_id,
      pharmacist_record.line_user_id,
      'shift_confirmed',
      pharmacist_message,
      1  -- 高優先度
    ) INTO queue_id;
    
    -- ログに記録
    INSERT INTO line_notification_logs (
      user_id,
      line_user_id,
      notification_type,
      message,
      status,
      sent_at
    ) VALUES (
      NEW.pharmacist_id,
      pharmacist_record.line_user_id,
      'shift_confirmed',
      pharmacist_message,
      'queued',
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもシフトの保存は継続
    INSERT INTO line_notification_logs (
      user_id,
      notification_type,
      message,
      status,
      error_message,
      sent_at
    ) VALUES (
      NEW.pharmacist_id,
      'shift_confirmed',
      'Error in trigger function',
      'failed',
      'Trigger function error: ' || SQLERRM,
      NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. コメント追加
COMMENT ON TABLE notification_queue IS '通知キューシステム（リトライ機能付き）';
COMMENT ON FUNCTION add_to_notification_queue(UUID, TEXT, TEXT, TEXT, INTEGER) IS '通知キューに通知を追加する関数';
COMMENT ON FUNCTION process_notification_queue() IS '通知キューから通知を処理する関数（リトライ機能付き）';
COMMENT ON FUNCTION send_queued_notifications() IS '手動でキューに溜まった通知を送信する関数';
COMMENT ON FUNCTION notify_shift_confirmed_with_queue() IS 'キューシステムを使用するシフト確定通知関数';
