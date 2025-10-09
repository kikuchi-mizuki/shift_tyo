-- シフト確定時に自動でLINE通知を送信するトリガー

-- トリガー関数を作成
CREATE OR REPLACE FUNCTION notify_shift_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  pharmacy_message TEXT;
  formatted_date TEXT;
BEGIN
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

  -- 薬局向けメッセージ
  pharmacy_message := '【シフト確定のお知らせ】' || E'\n\n' ||
                      '日時: ' || formatted_date || E'\n' ||
                      '時間: ' || time_info || E'\n';
  
  IF NEW.store_name IS NOT NULL THEN
    pharmacy_message := pharmacy_message || '店舗: ' || NEW.store_name || E'\n';
  END IF;

  pharmacy_message := pharmacy_message || '薬剤師: ' || pharmacist_record.name || 'さん' || E'\n';
  
  IF NEW.memo IS NOT NULL THEN
    pharmacy_message := pharmacy_message || E'\nメモ: ' || NEW.memo || E'\n';
  END IF;

  pharmacy_message := pharmacy_message || E'\nよろしくお願いします！';

  -- 薬剤師にLINE通知を送信（非同期）
  IF pharmacist_record.line_user_id IS NOT NULL AND pharmacist_record.line_notification_enabled THEN
    PERFORM net.http_post(
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
  END IF;

  -- 薬局にLINE通知を送信（非同期）
  IF pharmacy_record.line_user_id IS NOT NULL AND pharmacy_record.line_notification_enabled THEN
    PERFORM net.http_post(
      url := 'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE'
      ),
      body := jsonb_build_object(
        'userId', NEW.pharmacy_id,
        'message', pharmacy_message,
        'notificationType', 'shift_confirmed',
        'metadata', jsonb_build_object(
          'shiftDate', NEW.date,
          'timeSlot', NEW.time_slot,
          'pharmacistName', pharmacist_record.name
        )
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもシフトの保存は継続
    RAISE WARNING 'Error sending LINE notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成（INSERT時のみ）
DROP TRIGGER IF EXISTS trigger_notify_shift_confirmed ON assigned_shifts;
CREATE TRIGGER trigger_notify_shift_confirmed
  AFTER INSERT ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_confirmed();

-- コメント追加
COMMENT ON FUNCTION notify_shift_confirmed() IS 'シフト確定時にLINE通知を送信する関数';
COMMENT ON TRIGGER trigger_notify_shift_confirmed ON assigned_shifts IS 'シフトINSERT時に通知を送信するトリガー';

