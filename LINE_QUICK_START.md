# LINE通知機能 クイックスタートガイド

5ステップでLINE通知機能を導入できます！⚡

## 📋 必要なもの

- [ ] LINEアカウント
- [ ] Supabaseプロジェクト
- [ ] 10-15分の作業時間

---

## 🚀 5ステップで始める

### Step 1: LINE Bot を作成（5分）

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. 「コンソール」をクリック
3. 「新規プロバイダー作成」→ プロバイダー名を入力（例: シフトTYO）
4. 「Messaging API」チャンネルを作成
   - チャンネル名: `シフトTYO通知Bot`
   - カテゴリ: その他
5. 以下をメモ：
   - **Channel Access Token**（発行ボタンを押す）
   - **Channel Secret**

### Step 2: データベースをセットアップ（2分）

```bash
# Supabaseプロジェクトルートで実行
cd /Users/kikuchimizuki/Desktop/shift_tyo-main

# マイグレーション実行
supabase db push
```

これで以下が作成されます：
- `line_auth_codes`テーブル
- `line_notification_logs`テーブル
- `user_profiles`にLINE関連カラム追加
- シフト確定通知のトリガー

### Step 3: Edge Functionsをデプロイ（3分）

```bash
# 環境変数を設定
export LINE_CHANNEL_ACCESS_TOKEN='YOUR_TOKEN_HERE'
export LINE_CHANNEL_SECRET='YOUR_SECRET_HERE'
export WEB_APP_URL='https://your-app.com'
export SUPABASE_PROJECT_REF='your-project-ref'

# デプロイスクリプト実行
./deploy-line-functions.sh
```

または手動で：

```bash
supabase functions deploy send-line-notification
supabase functions deploy line-webhook
supabase functions deploy daily-shift-reminder
supabase functions deploy send-emergency-shift

supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="$LINE_CHANNEL_ACCESS_TOKEN"
supabase secrets set LINE_CHANNEL_SECRET="$LINE_CHANNEL_SECRET"
supabase secrets set WEB_APP_URL="$WEB_APP_URL"
```

### Step 4: LINE Webhook URLを設定（1分）

1. LINE Developersコンソールに戻る
2. 「Messaging API設定」タブを開く
3. **Webhook URL**に以下を設定：
   ```
   https://[YOUR_PROJECT_ID].supabase.co/functions/v1/line-webhook
   ```
4. 「Webhookの利用」を**オン**
5. 「応答メッセージ」を**オフ**（重要！）
6. 「検証」ボタンをクリックして接続確認

### Step 5: データベース設定とCron Job（2分）

#### 5-1. データベース設定

Supabaseダッシュボード → SQL Editorで実行：

```sql
-- Supabase URLとAnon Keyを設定
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_ID.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'YOUR_ANON_KEY_HERE';

SELECT pg_reload_conf();
```

#### 5-2. Cron Job設定

同じくSQL Editorで実行：

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-shift-reminder',
  '0 11 * * *',  -- 毎日20:00 JST
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-shift-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

---

## ✅ 動作確認

### 1. LINE連携のテスト

1. Webアプリにログイン
2. 設定画面を開く
3. 「LINE連携を開始する」をクリック
4. 認証コード（6桁）をメモ
5. LINE Botを友だち追加（QRコード）
6. Botに認証コードを送信
7. 「✅ 連携完了しました！」が届けばOK

### 2. シフト確定通知のテスト

1. 管理画面でテストシフトを作成：

```sql
INSERT INTO assigned_shifts (
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  store_name
) VALUES (
  'LINE連携済み薬剤師のID',
  'LINE連携済み薬局のID',
  CURRENT_DATE + 1,
  'morning',
  'confirmed',
  'テスト店舗'
);
```

2. 薬剤師と薬局の両方にLINE通知が届くことを確認

### 3. 前日リマインドのテスト（手動実行）

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/daily-shift-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

翌日のシフトがあるユーザーに通知が届けばOK。

---

## 🎨 フロントエンド統合

### 設定画面に追加

`src/components/SettingsPage.tsx`（新規作成済み）を使用：

```tsx
import { SettingsPage } from './components/SettingsPage';

// App.tsxやルーティング設定で
<SettingsPage 
  userId={user.id} 
  userName={user.name}
  userType={user.user_type}
/>
```

### 管理画面に緊急依頼ボタンを追加

`src/components/AdminDashboard.tsx`を編集：

```tsx
import { useState } from 'react';
import { EmergencyShiftRequest } from './components';

function AdminDashboard() {
  const [showEmergencyRequest, setShowEmergencyRequest] = useState(false);

  return (
    <div>
      <button onClick={() => setShowEmergencyRequest(true)}>
        🚨 緊急シフト募集
      </button>

      {showEmergencyRequest && (
        <EmergencyShiftRequest 
          onClose={() => setShowEmergencyRequest(false)} 
        />
      )}
    </div>
  );
}
```

---

## 📊 稼働状況の確認

### LINE連携ユーザー数

```sql
SELECT 
  user_type,
  COUNT(*) as total_users,
  COUNT(line_user_id) as linked_users,
  ROUND(100.0 * COUNT(line_user_id) / COUNT(*), 1) as link_rate
FROM user_profiles
GROUP BY user_type;
```

### 通知送信状況（過去7日間）

```sql
SELECT 
  DATE(sent_at) as date,
  notification_type,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
FROM line_notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), notification_type
ORDER BY date DESC;
```

---

## 🐛 トラブルシューティング

### ❌ 通知が届かない

**確認項目：**
1. LINE連携済みか？
   ```sql
   SELECT line_user_id FROM user_profiles WHERE id = 'USER_ID';
   ```
2. 通知がONか？
   ```sql
   SELECT line_notification_enabled FROM user_profiles WHERE id = 'USER_ID';
   ```
3. 送信履歴を確認
   ```sql
   SELECT * FROM line_notification_logs WHERE user_id = 'USER_ID' ORDER BY sent_at DESC LIMIT 5;
   ```

### ❌ Webhook検証が失敗

**確認項目：**
1. Webhook URLが正しいか
2. Edge Functionがデプロイされているか
   ```bash
   supabase functions list
   ```
3. `LINE_CHANNEL_SECRET`が正しいか
   ```bash
   supabase secrets list
   ```

### ❌ Cron Jobが動かない

**確認項目：**
1. pg_cronがインストールされているか
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
2. Jobが登録されているか
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-shift-reminder';
   ```
3. 実行履歴を確認
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-shift-reminder')
   ORDER BY start_time DESC LIMIT 5;
   ```

---

## 📚 次のステップ

✅ 基本セットアップ完了！

さらに詳しい情報は以下を参照：

- **詳細設定**: `LINE_INTEGRATION_SETUP.md`
- **使用例**: `USAGE_EXAMPLES.md`
- **カスタマイズ方法**: Edge Functionsのソースコードを編集

---

## 💰 料金について

### LINE Messaging API
- **無料枠**: 月1,000通まで
- **予想使用量**: 月200-350通
- **コスト**: 無料枠内 ✅

### Supabase
- **Edge Functions**: 月500,000リクエスト（無料枠）
- **予想使用量**: 月10,000リクエスト以下
- **コスト**: 無料枠内 ✅

**→ 両方とも無料枠で運用可能！**

---

## 🎉 完了！

これでLINE通知機能が使えるようになりました！

質問があれば：
- `LINE_INTEGRATION_SETUP.md` - 詳細ドキュメント
- `USAGE_EXAMPLES.md` - コード例
- GitHub Issues - サポート

Happy Coding! 🚀

