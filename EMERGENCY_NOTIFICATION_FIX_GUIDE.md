# 🚨 緊急シフト依頼送信失敗の修正ガイド

## 問題の概要

緊急シフト依頼の送信で「失敗: 1件」が発生している問題を修正します。

## 修正内容

### 1. 通知システムの改善
- 通知キュー処理関数の改善
- エラーハンドリングの強化
- リトライ機能の改善

### 2. 緊急シフト通知の即座送信機能
- キューを使わずに即座に通知を送信
- 失敗時の詳細なエラー情報提供

### 3. 失敗した通知の一括再処理機能
- 過去24時間の失敗した通知を自動再処理

## 修正手順

### Step 1: 修正スクリプトの実行

SupabaseダッシュボードのSQL Editorで以下の順番で実行してください：

1. **包括的修正の適用**
   ```sql
   -- comprehensive_notification_fix.sql の内容を実行
   ```

2. **システム状態の確認**
   ```sql
   -- fix_emergency_notification_failure.sql の内容を実行
   ```

3. **テストの実行**
   ```sql
   -- test_emergency_notification.sql の内容を実行
   ```

### Step 2: 動作確認

1. **通知システムの状態確認**
   ```sql
   SELECT * FROM get_notification_system_status();
   ```

2. **薬剤師のLINE連携状況確認**
   ```sql
   SELECT 
     id, name, 
     line_user_id IS NOT NULL as line_linked,
     line_notification_enabled
   FROM user_profiles 
   WHERE user_type = 'pharmacist';
   ```

3. **緊急シフト依頼の再テスト**
   - アプリケーションで緊急シフト依頼を送信
   - 結果を確認

## 主な修正点

### 1. 通知キュー処理関数の改善
- ユーザーの通知設定を事前チェック
- より詳細なエラーハンドリング
- リトライ間隔の調整

### 2. 即座送信機能の追加
- `send_emergency_notification_immediate()` 関数
- キューを使わない直接送信
- リアルタイムでの結果確認

### 3. 一括再処理機能
- `retry_all_failed_notifications()` 関数
- 過去24時間の失敗を自動再処理
- システムの自動復旧

## トラブルシューティング

### まだ失敗する場合

1. **LINE連携の確認**
   ```sql
   SELECT 
     id, name, line_user_id, line_notification_enabled
   FROM user_profiles 
   WHERE user_type = 'pharmacist' 
     AND line_user_id IS NOT NULL;
   ```

2. **Edge Functionの確認**
   - Supabase Dashboard → Functions
   - `send-line-notification` 関数のログを確認

3. **環境変数の確認**
   - LINE_CHANNEL_ACCESS_TOKEN が正しく設定されているか
   - Supabase URL とキーが正しいか

### 手動での緊急対応

もし自動修正が効かない場合は、手動で通知を送信できます：

```sql
-- 特定の薬剤師に手動で通知を送信
SELECT * FROM send_emergency_notification_immediate(
  ARRAY['薬剤師のUUID'],
  '2025-01-15'::date,
  '09:00-17:00',
  '店舗名'
);
```

## 今後の予防策

1. **定期監視**
   ```sql
   -- 毎時間実行することを推奨
   SELECT * FROM get_notification_system_status();
   ```

2. **失敗通知の自動再処理**
   ```sql
   -- 必要に応じて実行
   SELECT retry_all_failed_notifications();
   ```

3. **通知キューのクリーンアップ**
   ```sql
   -- 週次で実行
   SELECT cleanup_old_notifications();
   ```

## 完了確認

修正が完了したら、以下を確認してください：

- [ ] 緊急シフト依頼の送信が成功する
- [ ] 薬剤師にLINE通知が届く
- [ ] エラーメッセージが表示されない
- [ ] 通知キューの状態が正常

---

**注意**: この修正は本番環境に適用されるため、事前にバックアップを取ることを推奨します。
