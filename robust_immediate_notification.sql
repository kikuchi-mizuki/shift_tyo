-- エラー処理を強化した即座通知システム

CREATE OR REPLACE FUNCTION notify_shift_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  formatted_date TEXT;
  response_status INTEGER;
  response_body TEXT;
  auth_token TEXT;
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

  -- 薬剤師にLINE通知を即座に送信
  IF pharmacist_record.line_user_id IS NOT NULL AND pharmacist_record.line_notification_enabled THEN
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
                          '店舗: ' || COALESCE(NEW.store_name, '未設定') || E'\n';
    
    IF NEW.memo IS NOT NULL THEN
      pharmacist_message := pharmacist_message || E'\nメモ: ' || NEW.memo || E'\n';
    END IF;

    pharmacist_message := pharmacist_message || E'\nよろしくお願いします！';

    -- 認証トークンを設定
    auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';
    
    -- 即座にEdge Functionを呼び出し（エラー処理強化）
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
          'userId', NEW.pharmacist_id,
          'message', pharmacist_message,
          'notificationType', 'shift_confirmed'
        )::text
      ));

      -- 結果をログに記録
      IF response_status = 200 THEN
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
          'success',
          NOW()
        );
      ELSE
        -- 失敗時はキューに追加（フォールバック）
        INSERT INTO notification_queue (
          user_id,
          line_user_id,
          notification_type,
          message,
          priority,
          status
        ) VALUES (
          NEW.pharmacist_id,
          pharmacist_record.line_user_id,
          'shift_confirmed',
          pharmacist_message,
          1,
          'pending'
        );
        
        INSERT INTO line_notification_logs (
          user_id,
          line_user_id,
          notification_type,
          message,
          status,
          error_message,
          sent_at
        ) VALUES (
          NEW.pharmacist_id,
          pharmacist_record.line_user_id,
          'shift_confirmed',
          pharmacist_message,
          'failed',
          'HTTP ' || response_status || ': ' || response_body || ' (キューに追加)',
          NOW()
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- 例外時もキューに追加（フォールバック）
        INSERT INTO notification_queue (
          user_id,
          line_user_id,
          notification_type,
          message,
          priority,
          status
        ) VALUES (
          NEW.pharmacist_id,
          pharmacist_record.line_user_id,
          'shift_confirmed',
          pharmacist_message,
          1,
          'pending'
        );
        
        INSERT INTO line_notification_logs (
          user_id,
          line_user_id,
          notification_type,
          message,
          status,
          error_message,
          sent_at
        ) VALUES (
          NEW.pharmacist_id,
          pharmacist_record.line_user_id,
          'shift_confirmed',
          pharmacist_message,
          'failed',
          'Exception: ' || SQLERRM || ' (キューに追加)',
          NOW()
        );
    END;
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
