-- 使用されていないテーブルを削除するマイグレーション
-- 注意: このマイグレーションは本番環境で実行する前に、データのバックアップを取ってください

-- 現在のアプリケーションで実際に使用されていないテーブルのみを削除
-- AIマッチング機能はAdminDashboardで使用されているため、関連テーブルは保持

-- 1. learning_data テーブルを削除（AIマッチングで使用されているが、実際のデータは保存されていない）
DROP TABLE IF EXISTS learning_data CASCADE;

-- 2. line_notification_logs テーブルを削除（LINE機能で部分的に使用されているが、ログ機能は未実装）
DROP TABLE IF EXISTS line_notification_logs CASCADE;

-- 注意: 以下のテーブルは保持（実際に使用されている）
-- - match_outcomes: AIマッチング機能で使用
-- - pharmacist_profiles: AIマッチング機能で使用  
-- - pharmacy_profiles: AIマッチング機能で使用
-- - matching_history: AIマッチング機能で使用
-- - line_auth_codes: LINE連携機能で使用

-- コメント: 削除されたテーブル
-- - learning_data: 学習データ（AIマッチングで定義されているが実際には使用されていない）
-- - line_notification_logs: LINE通知ログ（LINE機能で定義されているが実際には使用されていない）

-- 注意: このマイグレーションを実行する前に、以下のテーブルが実際に使用されていないことを確認してください：
-- - user_profiles テーブルの line_user_id, line_linked_at, line_notification_enabled カラムは残す
-- - 他のコアテーブル（shift_requests, shift_postings, assigned_shifts, user_profiles など）は保持
-- - AIマッチング関連テーブル（match_outcomes, pharmacist_profiles, pharmacy_profiles, matching_history）は保持
-- - LINE認証テーブル（line_auth_codes）は保持
