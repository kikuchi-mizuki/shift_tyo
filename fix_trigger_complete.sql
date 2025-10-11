-- 完全なトリガー修正版

-- 1. 既存のトリガーを削除
DROP TRIGGER IF EXISTS trigger_notify_shift_confirmed ON assigned_shifts;
DROP TRIGGER IF EXISTS trg_asg_updated ON assigned_shifts;

-- 2. 正しいトリガー関数を作成
CREATE OR REPLACE FUNCTION notify_shift_confirmed()
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

-- 3. 正しいトリガーを作成（INSERT AND UPDATE）
CREATE TRIGGER trigger_notify_shift_confirmed
  AFTER INSERT OR UPDATE ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_confirmed();

-- 4. updated_atトリガーも再作成
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asg_updated
  BEFORE UPDATE ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
