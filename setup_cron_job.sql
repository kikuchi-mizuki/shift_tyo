-- 定期的なキュー処理の設定

-- 1. 手動でキューを処理する関数（既に作成済み）
-- SELECT send_queued_notifications();

-- 2. キュー処理の統計を確認する関数
CREATE OR REPLACE FUNCTION get_notification_queue_stats()
RETURNS TABLE(
  total_pending INTEGER,
  total_processing INTEGER,
  total_success INTEGER,
  total_failed INTEGER,
  oldest_pending TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as total_processing,
    COUNT(*) FILTER (WHERE status = 'success')::INTEGER as total_success,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as total_failed,
    MIN(scheduled_at) FILTER (WHERE status = 'pending') as oldest_pending
  FROM notification_queue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 失敗した通知を再処理する関数
CREATE OR REPLACE FUNCTION retry_failed_notifications()
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
    AND created_at >= NOW() - INTERVAL '24 hours';  -- 24時間以内の失敗のみ再処理
  
  GET DIAGNOSTICS retry_count = ROW_COUNT;
  RETURN retry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 古い通知ログをクリーンアップする関数
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- 7日以上前の成功した通知を削除
  DELETE FROM notification_queue 
  WHERE status = 'success' 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. コメント追加
COMMENT ON FUNCTION get_notification_queue_stats() IS '通知キューの統計情報を取得する関数';
COMMENT ON FUNCTION retry_failed_notifications() IS '失敗した通知を再処理する関数';
COMMENT ON FUNCTION cleanup_old_notifications() IS '古い通知ログをクリーンアップする関数';