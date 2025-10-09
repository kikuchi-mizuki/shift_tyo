# LINE通知機能 セットアップガイド

このガイドでは、シフトTYOシステムにLINE通知機能を追加する手順を説明します。

## 📋 目次

1. [機能概要](#機能概要)
2. [LINE Developers セットアップ](#line-developers-セットアップ)
3. [Supabase セットアップ](#supabase-セットアップ)
4. [環境変数の設定](#環境変数の設定)
5. [デプロイ手順](#デプロイ手順)
6. [テスト方法](#テスト方法)
7. [トラブルシューティング](#トラブルシューティング)

---

## 機能概要

### 実装される機能

1. **シフト確定通知** 🎯
   - シフトが確定したら薬剤師と薬局の両方に自動通知
   - Database Triggerで自動送信

2. **前日リマインド** ⏰
   - 毎日20:00に翌日のシフトをリマインド
   - Supabase Cronで定期実行

3. **緊急シフト依頼** 🚨
   - 管理画面から緊急募集を一斉送信
   - 送信先を選択可能（全員/特定の薬剤師/近隣の薬剤師）

---

## LINE Developers セットアップ

### 1. LINE Developersコンソールにアクセス

1. [LINE Developers](https://developers.line.biz/)にアクセス
2. LINEアカウントでログイン
3. 「コンソール」をクリック

### 2. プロバイダーを作成

1. 「作成」ボタンをクリック
2. プロバイダー名を入力（例: `シフトTYO`）
3. 「作成」をクリック

### 3. Messaging APIチャンネルを作成

1. 「Messaging API」を選択
2. 以下の情報を入力：
   - **チャンネル名**: `シフトTYO通知Bot`
   - **チャンネル説明**: `薬局・薬剤師のシフト通知用Bot`
   - **大業種**: `その他`
   - **小業種**: `その他`
   - **メールアドレス**: あなたのメールアドレス
3. 利用規約に同意して「作成」

### 4. チャンネル設定

#### 4-1. Channel Access Tokenを取得

1. 「Messaging API設定」タブを開く
2. 「Channel access token」セクションで「発行」をクリック
3. 発行されたトークンをコピーして安全な場所に保存

#### 4-2. Channel Secretを取得

1. 「チャンネル基本設定」タブを開く
2. 「Channel secret」をコピーして保存

#### 4-3. Webhook設定

1. 「Messaging API設定」タブに戻る
2. 「Webhook URL」に以下を設定（後で更新）:
   ```
   https://[YOUR_PROJECT_ID].supabase.co/functions/v1/line-webhook
   ```
3. 「Webhookの利用」を**オン**にする
4. 「応答メッセージ」を**オフ**にする（重要！）
5. 「あいさつメッセージ」は任意

#### 4-4. QRコードを取得

1. 「Messaging API設定」タブで「QRコード」を確認
2. このQRコードをユーザーに配布します

---

## Supabase セットアップ

### 1. データベースマイグレーション

以下のマイグレーションを実行します：

```bash
# Supabaseプロジェクトにログイン
supabase login

# ローカルでマイグレーション実行（テスト）
supabase db reset

# 本番環境にプッシュ
supabase db push
```

実行されるマイグレーション：
- `20250110000000_add_line_integration.sql` - LINE連携用テーブル追加
- `20250110000001_add_shift_confirmation_trigger.sql` - シフト確定通知トリガー

### 2. Edge Functionsのデプロイ

以下のEdge Functionsをデプロイします：

```bash
# 1. LINE通知送信Function
supabase functions deploy send-line-notification

# 2. LINE Webhook
supabase functions deploy line-webhook

# 3. 前日リマインド
supabase functions deploy daily-shift-reminder

# 4. 緊急シフト依頼
supabase functions deploy send-emergency-shift
```

### 3. Cron Jobの設定

Supabaseダッシュボードで以下のCron Jobを設定します：

1. Supabaseダッシュボードにアクセス
2. 「Database」→「Cron Jobs」に移動
3. 「Create a new cron job」をクリック
4. 以下を設定：

```sql
-- 前日リマインド（毎日20:00に実行）
SELECT cron.schedule(
  'daily-shift-reminder',
  '0 11 * * *',  -- UTC 11:00 = JST 20:00
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-shift-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

---

## 環境変数の設定

### Supabase環境変数

Supabaseダッシュボードで以下の環境変数を設定します：

1. 「Settings」→「Functions」→「Secrets」に移動
2. 以下を追加：

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
WEB_APP_URL=https://your-app-url.com
```

### Supabase設定の追加

Database設定に以下を追加（SQL Editorで実行）：

```sql
-- Supabase URLとAnon Keyを設定に保存
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://[YOUR_PROJECT_ID].supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your_anon_key_here';
```

### Railway/Vercel環境変数

フロントエンドのデプロイ先でも以下を設定：

```bash
VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## デプロイ手順

### 1. Supabaseへのデプロイ

```bash
# マイグレーション実行
supabase db push

# Edge Functionsデプロイ
supabase functions deploy send-line-notification
supabase functions deploy line-webhook
supabase functions deploy daily-shift-reminder
supabase functions deploy send-emergency-shift

# 環境変数設定
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=your_token
supabase secrets set LINE_CHANNEL_SECRET=your_secret
supabase secrets set WEB_APP_URL=https://your-app.com
```

### 2. LINE WebhookのURL更新

1. LINE Developersコンソールに戻る
2. 「Messaging API設定」タブ
3. 「Webhook URL」を更新:
   ```
   https://[YOUR_PROJECT_ID].supabase.co/functions/v1/line-webhook
   ```
4. 「検証」ボタンをクリックして接続確認

### 3. フロントエンドのデプロイ

```bash
# ビルド
npm run build

# Railwayにデプロイ（または任意のホスティング）
# package.jsonのstartスクリプトが自動実行されます
```

---

## テスト方法

### 1. LINE連携のテスト

1. Webアプリにログイン（薬剤師または薬局として）
2. 設定画面で「LINE連携を開始する」をクリック
3. 認証コード（6桁）が表示される
4. LINE Botを友だち追加（QRコードから）
5. Botに認証コードを送信
6. 「✅ 連携完了しました！」というメッセージが返ってくればOK

### 2. シフト確定通知のテスト

1. 管理画面でシフトを確定
2. 薬剤師と薬局の両方にLINE通知が届くことを確認
3. 通知内容を確認：
   - 日付、時間帯
   - 店舗名/薬剤師名
   - メモ（あれば）

### 3. 前日リマインドのテスト

手動でテストする場合：

```bash
# Edge Functionを直接呼び出し
curl -X POST \
  https://[YOUR_PROJECT_ID].supabase.co/functions/v1/daily-shift-reminder \
  -H "Authorization: Bearer [YOUR_ANON_KEY]"
```

翌日のシフトがあるユーザーにリマインドが届けばOK。

### 4. 緊急シフト依頼のテスト

1. 管理画面で「緊急シフト募集」ボタンをクリック
2. シフト情報を入力
3. 送信先を選択（テストでは「特定の薬剤師」で自分だけに送信）
4. 「送信」をクリック
5. LINE通知が届くことを確認

---

## トラブルシューティング

### Q1: 通知が届かない

**確認項目:**
1. LINE連携が完了しているか確認
   ```sql
   SELECT id, name, line_user_id, line_notification_enabled 
   FROM user_profiles 
   WHERE id = 'your_user_id';
   ```
2. `line_notification_enabled`が`true`になっているか
3. 通知履歴を確認
   ```sql
   SELECT * FROM line_notification_logs 
   ORDER BY sent_at DESC 
   LIMIT 10;
   ```
4. Edge Functionのログを確認（Supabaseダッシュボード）

### Q2: LINE Webhookがエラーになる

**確認項目:**
1. Webhook URLが正しいか
2. `LINE_CHANNEL_SECRET`が正しく設定されているか
3. Supabase Edge Functionのログを確認
4. LINE Developersの「応答メッセージ」がオフになっているか

### Q3: Cron Jobが実行されない

**確認項目:**
1. Cron式が正しいか（UTCで指定）
2. データベース設定が正しいか
   ```sql
   SELECT name, setting 
   FROM pg_settings 
   WHERE name LIKE 'app.settings%';
   ```
3. Supabaseのログを確認

### Q4: 認証コードが無効

**原因:**
- 15分経過して期限切れ
- 既に使用済み

**解決方法:**
- 新しい認証コードを生成

### Q5: エラーログの確認方法

```bash
# Edge Functionのログを確認
supabase functions logs send-line-notification
supabase functions logs line-webhook

# データベースログ
# Supabaseダッシュボード → Logs → Database
```

---

## 料金について

### LINE Messaging API

**無料枠:**
- 月間1,000通まで無料
- 追加は従量課金（~3円/通）

**予想コスト:**
- シフト確定: 月100-200通
- 前日リマインド: 月50-100通
- 緊急依頼: 月10-50通
- **合計: 月200-350通 → 無料枠内で運用可能** ✅

### Supabase Edge Functions

**無料枠:**
- 月間500,000リクエスト
- 100,000実行秒

**予想コスト:**
- 無料枠で十分 ✅

---

## サポート

問題が解決しない場合：

1. [LINE Developers ドキュメント](https://developers.line.biz/ja/docs/)
2. [Supabase ドキュメント](https://supabase.com/docs)
3. GitHubのIssueを作成

---

## ライセンス

このプロジェクトのライセンスに従います。

