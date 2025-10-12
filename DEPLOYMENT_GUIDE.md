# 🚀 Edge Function デプロイガイド

## 📋 ローカルPCからのデプロイ手順

### 1️⃣ Supabase CLI インストール

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# もしくは npm
npm i -g supabase
```

### 2️⃣ ログイン & プロジェクト紐付け

```bash
# Supabaseにログイン（ブラウザでトークン入力）
supabase login

# プロジェクトに紐付け
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 3️⃣ Edge Function用シークレット設定（初回のみ）

**重要**: `<YOUR_SERVICE_ROLE_KEY>`を実際のService Role Keyに置き換えてください。

```bash
supabase functions secrets set \
  SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
```

#### Service Role Key の取得方法：
1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト選択
2. **Settings** → **API** をクリック
3. **Project API keys** セクションの **service_role** キーをコピー

### 4️⃣ デプロイ実行

```bash
# "api" という関数名でデプロイ
supabase functions deploy api --project-ref <YOUR_PROJECT_REF>
```

### 5️⃣ 動作確認

```bash
# user_profiles を1件取得してテスト
curl -s "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/api/user_profiles?limit=1" \
  -H "Authorization: Bearer <YOUR_ANON_KEY>"
```

**期待される結果**: 200ステータスでJSONデータが返される

## 🔧 開発中のローカル実行（オプション）

```bash
# ローカルでEdge Functionを実行
supabase functions serve --env-file .env
```

## ✅ デプロイ完了後の確認事項

1. **PGRST205エラーの解消** - アプリケーションでエラーが出なくなる
2. **データ取得の安定化** - 4つのリソースが正常に取得できる
3. **本番環境の動作** - Supabase認証とデータベース連携が正常動作

## 🚨 トラブルシューティング

### エラー: "Function not found"
- デプロイが完了していない可能性があります
- `supabase functions list` でデプロイ状況を確認

### エラー: "Unauthorized" 
- Service Role Keyが正しく設定されていない可能性があります
- シークレット設定を再実行してください

### エラー: "Database connection failed"
- データベースマイグレーションが完了していない可能性があります
- `SETUP_DATABASE.md` の手順を確認してください

## 📞 サポート

デプロイで問題が発生した場合は、エラーメッセージと実行したコマンドをお知らせください。