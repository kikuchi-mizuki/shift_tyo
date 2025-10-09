# LINE通知機能 使用例

このドキュメントでは、LINE通知機能をアプリケーションに統合する方法を説明します。

## 📱 LINE連携コンポーネント

### SettingsPageに追加

ユーザーがLINE連携を設定できる画面を追加します。

```tsx
import { LineIntegration } from './components/LineIntegration';

function SettingsPage({ user }) {
  return (
    <div>
      <h1>設定</h1>
      <LineIntegration userId={user.id} />
    </div>
  );
}
```

### 既存のプロフィール画面に追加

```tsx
import { LineIntegration } from './components';

function UserProfile({ userId }) {
  return (
    <div className="space-y-6">
      {/* 既存のプロフィール情報 */}
      <ProfileInfo userId={userId} />
      
      {/* LINE通知設定を追加 */}
      <LineIntegration userId={userId} />
    </div>
  );
}
```

---

## 🚨 緊急シフト依頼

### AdminDashboardに追加

管理画面に緊急シフト依頼ボタンを追加します。

#### 1. ステート管理

```tsx
import { EmergencyShiftRequest } from './components';

function AdminDashboard() {
  const [showEmergencyRequest, setShowEmergencyRequest] = useState(false);
  
  // ... 既存のコード
}
```

#### 2. ボタンの追加

```tsx
// ヘッダー部分に追加
<div className="flex justify-between items-center mb-6">
  <h1>管理画面</h1>
  
  <button
    onClick={() => setShowEmergencyRequest(true)}
    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
  >
    <AlertCircle className="w-5 h-5" />
    緊急シフト募集
  </button>
</div>
```

#### 3. モーダルの表示

```tsx
// コンポーネントの最後に追加
{showEmergencyRequest && (
  <EmergencyShiftRequest 
    onClose={() => setShowEmergencyRequest(false)} 
  />
)}
```

### 完全な例

```tsx
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { EmergencyShiftRequest } from './components';

function AdminDashboard() {
  const [showEmergencyRequest, setShowEmergencyRequest] = useState(false);

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
        
        <button
          onClick={() => setShowEmergencyRequest(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <AlertCircle className="w-5 h-5" />
          緊急シフト募集
        </button>
      </div>

      {/* 既存のコンテンツ */}
      <div className="space-y-6">
        {/* シフト管理など */}
      </div>

      {/* 緊急シフト依頼モーダル */}
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

## 🔔 通知の種類と自動送信

### 1. シフト確定通知（自動）

シフトが`assigned_shifts`テーブルに挿入されると自動的に送信されます。

```tsx
// 管理画面でシフトを確定
const confirmShift = async (shiftData) => {
  const { data, error } = await supabase
    .from('assigned_shifts')
    .insert([{
      pharmacist_id: 'xxx',
      pharmacy_id: 'yyy',
      date: '2025-01-15',
      time_slot: 'morning',
      status: 'confirmed',
      // ...
    }]);
  
  // ↑ INSERT時にDatabase Triggerが発火し、
  // 薬剤師と薬局の両方にLINE通知が自動送信される
};
```

**送信される通知の例（薬剤師向け）:**
```
【シフト確定のお知らせ】

日時: 1月15日
時間: 午前
店舗: ○○薬局 渋谷店

よろしくお願いします！
```

**送信される通知の例（薬局向け）:**
```
【シフト確定のお知らせ】

日時: 1月15日
時間: 午前
店舗: ○○薬局 渋谷店
薬剤師: 山田太郎さん

よろしくお願いします！
```

### 2. 前日リマインド（自動・定期実行）

毎日20:00（JST）に翌日のシフトがあるユーザーに自動送信されます。

設定不要。Cron Jobで自動実行されます。

**送信される通知の例:**
```
【明日のシフトのお知らせ】

日時: 1月15日(月)
時間: 09:00〜13:00
店舗: ○○薬局 渋谷店
住所: 東京都渋谷区...

忘れずにご出勤ください！
```

### 3. 緊急シフト依頼（手動）

管理画面の「緊急シフト募集」ボタンから送信します。

上記の「管理画面に追加」セクションを参照。

---

## 🎨 カスタマイズ

### LINE通知メッセージのカスタマイズ

通知メッセージをカスタマイズしたい場合、以下のファイルを編集します：

#### シフト確定通知

`supabase/migrations/20250110000001_add_shift_confirmation_trigger.sql`

```sql
-- 薬剤師向けメッセージ
pharmacist_message := '【シフト確定のお知らせ】' || E'\n\n' ||
                      '日時: ' || formatted_date || E'\n' ||
                      '時間: ' || time_info || E'\n' ||
                      '店舗: ' || COALESCE(NEW.store_name, pharmacy_record.name, '未設定');
```

#### 前日リマインド

`supabase/functions/daily-shift-reminder/index.ts`

```typescript
const message = `【明日のシフトのお知らせ】\n\n日時: ${formatDate(
  shift.date
)}\n時間: ${timeInfo}\n店舗: ${
  shift.store_name || shift.pharmacy?.name || "未設定"
}`;
```

#### 緊急シフト依頼

`supabase/functions/send-emergency-shift/index.ts`

```typescript
const message = `【🚨 緊急シフト募集】\n\n日時: ${formatDate(
  request.date
)}\n時間: ${timeInfo}\n...`;
```

### スタイルのカスタマイズ

コンポーネントのスタイルは全てTailwind CSSで定義されています。

```tsx
// LineIntegration.tsx
<button className="w-full bg-green-600 text-white ...">
  LINE連携を開始する
</button>
```

カラーやレイアウトを変更する場合は、className属性を編集してください。

---

## 🧪 テストとデバッグ

### 通知履歴の確認

```sql
-- 最新の通知履歴を確認
SELECT 
  notification_type,
  status,
  message,
  sent_at,
  error_message
FROM line_notification_logs
ORDER BY sent_at DESC
LIMIT 20;
```

### LINE連携状態の確認

```sql
-- LINE連携済みユーザーを確認
SELECT 
  id,
  name,
  user_type,
  line_user_id,
  line_notification_enabled,
  line_linked_at
FROM user_profiles
WHERE line_user_id IS NOT NULL;
```

### Edge Functionのログ確認

```bash
# ローカル開発
supabase functions logs send-line-notification --local

# 本番環境
supabase functions logs send-line-notification
```

### 手動でテスト通知を送信

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-line-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "message": "テスト通知です",
    "notificationType": "shift_confirmed"
  }'
```

---

## 📊 通知統計の取得

### 送信成功率

```sql
SELECT 
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM line_notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_type;
```

### 日別送信数

```sql
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as count,
  notification_type
FROM line_notification_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at), notification_type
ORDER BY date DESC, notification_type;
```

---

## 🔧 トラブルシューティング

### 通知が届かない場合

1. **LINE連携を確認**
   ```sql
   SELECT line_user_id, line_notification_enabled 
   FROM user_profiles 
   WHERE id = 'user_id';
   ```

2. **通知履歴を確認**
   ```sql
   SELECT * FROM line_notification_logs 
   WHERE user_id = 'user_id' 
   ORDER BY sent_at DESC;
   ```

3. **Edge Functionのログを確認**
   - Supabaseダッシュボード → Functions → Logs

### エラーメッセージの解説

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `LINE not linked` | LINE連携していない | ユーザーに連携を依頼 |
| `Notification disabled by user` | 通知をOFFにしている | 設定画面でONに変更 |
| `Invalid LINE signature` | Webhook署名が不正 | `LINE_CHANNEL_SECRET`を確認 |
| `User profile not found` | ユーザーが存在しない | user_idを確認 |

---

## 💡 ベストプラクティス

1. **通知頻度の管理**
   - 緊急依頼は1日1-2回程度に抑える
   - ユーザーが通知をOFFにできるようにする

2. **メッセージの簡潔化**
   - 必要な情報のみを含める
   - 長文は避ける（LINEは改行が多いと読みにくい）

3. **エラーハンドリング**
   - 通知失敗してもメイン機能は継続する
   - エラーログを定期的に確認

4. **テスト環境**
   - 本番環境とは別のLINE Botを用意
   - テストユーザーで動作確認

---

## 📚 参考リンク

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [pg_cron ドキュメント](https://github.com/citusdata/pg_cron)

---

質問や問題があれば、GitHubのIssueで報告してください！

