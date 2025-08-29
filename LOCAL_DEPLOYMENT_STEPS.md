# 🚀 ローカル環境でのデプロイ手順

## 📥 Step 1: プロジェクトをローカルにダウンロード

### 方法A: Boltからダウンロード（推奨）
1. **Bolt画面右上**の「📥 Download」ボタンをクリック
2. ZIPファイルをダウンロード
3. ローカルPCで解凍

### 方法B: 手動コピー
```bash
# ローカルPCで新しいフォルダ作成
mkdir pharmacy-shift-system
cd pharmacy-shift-system

# 重要ファイルを手動でコピー
mkdir -p supabase/functions/api
# 以下のファイルをBoltからコピー：
# - supabase/functions/api/index.ts
# - package.json
# - .env
```

## 🛠️ Step 2: 環境セットアップ

```bash
# プロジェクトフォルダに移動
cd pharmacy-shift-system

# Supabase CLIインストール
npm i -g supabase

# Supabaseにログイン（ブラウザが開きます）
supabase login

# プロジェクトにリンク
supabase link --project-ref wjgterfwurmvosawzbjs
```

## 🔑 Step 3: Service Role Key取得

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト `wjgterfwurmvosawzbjs` を選択
3. **Settings** → **API** をクリック
4. **Project API keys** の **service_role** をコピー

## 🚀 Step 4: デプロイ実行

```bash
# Edge Function用環境変数設定（YOUR_SERVICE_ROLE_KEYを実際の値に置換）
supabase functions secrets set \
  SUPABASE_URL=https://wjgterfwurmvosawzbjs.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Edge Functionデプロイ
supabase functions deploy api --project-ref wjgterfwurmvosawzbjs
```

## ✅ Step 5: 動作確認

```bash
# API動作テスト
curl -s "https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/api/user_profiles?limit=1" \
  -H "Authorization: Bearer sb_publishable_nCoPvmldzPho7y_8AwLhXQ_IcLfvRFN"
```

**期待される結果**: 200ステータスでJSONデータが返される

## 🔧 トラブルシューティング

### エラー: "supabase command not found"
```bash
# npmでインストール
npm i -g supabase

# または Homebrew (macOS)
brew install supabase/tap/supabase
```

### エラー: "Invalid access token"
- Personal Access Tokenを再作成
- GitHub Secretsの設定を確認

### エラー: "Function deployment failed"
- Service Role Keyが正しいか確認
- プロジェクトIDが正しいか確認

## 📞 サポート

問題が発生した場合は、エラーメッセージと実行したコマンドをお知らせください。

---

**次のステップ**: `LOCAL_DEPLOYMENT_STEPS.md` の手順に従ってローカル環境でデプロイを実行してください。