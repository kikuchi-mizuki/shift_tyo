# Edge Function デプロイ手順

## 🚨 重要：WebContainer制限について

WebContainer環境では以下の制限があります：
- Supabase CLIが利用できません
- Edge Functionの直接デプロイができません

## 📋 ローカル環境でのデプロイ手順

### 1. 前提条件
```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# または
brew install supabase/tap/supabase
```

### 2. プロジェクトセットアップ
```bash
# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref wjgterfwurmvosawzbjs
```

### 3. Edge Function用環境変数設定
```bash
# 必要な環境変数を設定
supabase functions secrets set SUPABASE_URL=https://wjgterfwurmvosawzbjs.supabase.co
supabase functions secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_ACTUAL_SERVICE_ROLE_KEY>
```

**重要**: `<YOUR_ACTUAL_SERVICE_ROLE_KEY>`を実際のService Role Keyに置き換えてください。

### 4. Edge Functionデプロイ
```bash
# API Edge Functionをデプロイ
supabase functions deploy api
```

### 5. デプロイ確認
```bash
# デプロイされた関数の確認
supabase functions list

# テスト実行
curl -X GET "https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/api/user_profiles?limit=1" \
  -H "Authorization: Bearer sb_publishable_nCoPvmldzPho7y_8AwLhXQ_IcLfvRFN"
```

## 🔧 Service Role Keyの取得方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクト `wjgterfwurmvosawzbjs` を選択
3. 左サイドバーの **Settings** → **API** をクリック
4. **Project API keys** セクションの **service_role** キーをコピー

## ✅ デプロイ完了後の確認

デプロイが完了すると：
1. `PGRST205`エラーが解消されます
2. 本番環境でのデータ取得が安定します
3. 4つのリソース（user_profiles, shift_requests, shift_postings, assigned_shifts）が利用可能になります

## 🚀 代替案：GitHub Actions

ローカル環境がない場合は、GitHub Actionsでの自動デプロイも可能です：

```yaml
# .github/workflows/deploy-functions.yml
name: Deploy Supabase Functions
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy api
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: wjgterfwurmvosawzbjs
```