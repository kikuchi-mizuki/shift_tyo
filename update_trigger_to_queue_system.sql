-- キューシステムを使用するトリガーに変更

-- 1. 既存のトリガーを削除
DROP TRIGGER IF EXISTS trigger_notify_shift_confirmed ON assigned_shifts;

-- 2. キューシステムを使用するトリガーを作成
CREATE TRIGGER trigger_notify_shift_confirmed
  AFTER INSERT ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_confirmed_with_queue();

-- 3. コメント追加
COMMENT ON TRIGGER trigger_notify_shift_confirmed ON assigned_shifts IS 'シフトINSERT時に通知をキューに追加するトリガー（安定版）';
