# デプロイメントガイド

## 本番環境設定

### 1. 環境変数の設定

デプロイプラットフォーム（Railway, Vercel等）で以下の環境変数を設定してください：

```bash
# Supabase設定
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Sentry設定（エラートラッキング）
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# デバッグログ設定（開発環境のみ）
VITE_ENABLE_DEBUG_LOGS=false
```

### 2. Supabase設定

#### ログ保持期間の設定（90日間）

Supabaseダッシュボードで以下のSQL関数を実行してください：

```sql
-- line_notification_logsテーブルの自動削除（90日以上前のログ）
CREATE OR REPLACE FUNCTION delete_old_notification_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM line_notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 毎日実行するCron job（Supabase pg_cronを使用）
SELECT cron.schedule(
  'delete-old-logs',
  '0 2 * * *', -- 毎日午前2時に実行
  $$SELECT delete_old_notification_logs()$$
);
```

####CORS設定

Supabaseダッシュボード > Settings > API > CORS Configuration:

```
# 本番ドメインのみ許可
https://your-production-domain.com
```

### 3. セキュリティチェックリスト

- [ ] 環境変数が正しく設定されている
- [ ] RLSポリシーが設定されている
- [ ] CORS設定が本番ドメインに限定されている
- [ ] Sentryが正しく設定されている
- [ ] ログ保持期間が90日に設定されている

### 4. パフォーマンス監視

#### Sentry設定（既に実装済み）

`src/main.tsx`で設定済み：
- Performance Monitoring: トランザクションの10%をキャプチャ
- Session Replay: エラー時100%、通常時10%
- エラートラッキング: すべてのエラーをキャプチャ

### 5. デプロイコマンド

```bash
# ビルド
npm run build

# E2Eテスト
npm run test:e2e

# デプロイ（プラットフォームに応じて）
git push origin main
```
