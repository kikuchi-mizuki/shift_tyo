-- net.http_postを使わずにLINE通知を送信する修正版トリガー関数

-- 1. 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS trigger_notify_shift_confirmed ON assigned_shifts;
DROP FUNCTION IF EXISTS notify_shift_confirmed();

-- 2. net.http_postを使わない修正版の通知関数を作成
CREATE OR REPLACE FUNCTION notify_shift_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  formatted_date TEXT;
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

  -- 薬剤師にLINE通知を送信（ログのみ記録、実際の送信は別途処理）
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
      'ready_to_send',
      NOW()
    );
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
COMMENT ON FUNCTION notify_shift_confirmed() IS 'シフト確定時にLINE通知ログを記録する関数（net.http_postを使わない版）';
COMMENT ON TRIGGER trigger_notify_shift_confirmed ON assigned_shifts IS 'シフトINSERT時に通知ログを記録するトリガー（net.http_postを使わない版）';
