-- LINE通知が届かない問題を修正するためのトリガー関数

-- 1. 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS trigger_notify_shift_confirmed ON assigned_shifts;
DROP FUNCTION IF EXISTS notify_shift_confirmed();

-- 2. 修正版の通知関数を作成
CREATE OR REPLACE FUNCTION notify_shift_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  pharmacy_message TEXT;
  formatted_date TEXT;
  response_status INTEGER;
  response_body TEXT;
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
    INSERT INTO line_notification_logs (
      user_id,
      notification_type,
      message,
      status,
      sent_at
    ) VALUES (
      NEW.pharmacist_id,
      'debug',
      'ステータスがconfirmedではない: ' || NEW.status,
      'success',
      NOW()
    );
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

  -- 薬剤師情報のデバッグログ
  INSERT INTO line_notification_logs (
    user_id,
    notification_type,
    message,
    status,
    sent_at
  ) VALUES (
    NEW.pharmacist_id,
    'debug',
    '薬剤師情報: line_user_id=' || COALESCE(pharmacist_record.line_user_id, 'NULL') || 
    ', notification_enabled=' || COALESCE(pharmacist_record.line_notification_enabled::text, 'NULL') ||
    ', name=' || COALESCE(pharmacist_record.name, 'NULL'),
    'success',
    NOW()
  );

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

  -- 薬剤師にLINE通知を送信
  IF pharmacist_record.line_user_id IS NOT NULL AND pharmacist_record.line_notification_enabled THEN
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
      'attempting',
      NOW()
    );

    -- Edge Functionを呼び出し
    BEGIN
      SELECT status, content INTO response_status, response_body
      FROM net.http_post(
        url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
        ),
        body := jsonb_build_object(
          'userId', NEW.pharmacist_id,
          'message', pharmacist_message,
          'notificationType', 'shift_confirmed',
          'metadata', jsonb_build_object(
            'shiftDate', NEW.date,
            'timeSlot', NEW.time_slot,
            'storeName', NEW.store_name
          )
        )
      );

      -- レスポンスのログ記録
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
        CASE WHEN response_status = 200 THEN 'success' ELSE 'failed' END,
        CASE WHEN response_status != 200 THEN 'HTTP ' || response_status || ': ' || response_body ELSE NULL END,
        NOW()
      );

    EXCEPTION
      WHEN OTHERS THEN
        -- エラーログを記録
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
          'Exception: ' || SQLERRM,
          NOW()
        );
    END;
  ELSE
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
      pharmacist_message,
      'failed',
      '薬剤師のLINE連携未完了または通知無効: line_user_id=' || COALESCE(pharmacist_record.line_user_id::text, 'NULL') || ', notification_enabled=' || COALESCE(pharmacist_record.line_notification_enabled::text, 'NULL'),
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

-- 3. トリガーを作成
CREATE TRIGGER trigger_notify_shift_confirmed
  AFTER INSERT ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_confirmed();

-- 4. コメント追加
COMMENT ON FUNCTION notify_shift_confirmed() IS 'シフト確定時にLINE通知を送信する関数（デバッグログ付き）';
COMMENT ON TRIGGER trigger_notify_shift_confirmed ON assigned_shifts IS 'シフトINSERT時に通知を送信するトリガー（デバッグログ付き）';
