#!/bin/bash

# LINE通知機能のデプロイスクリプト
# 使い方: ./deploy-line-functions.sh

set -e

echo "🚀 LINE通知機能のデプロイを開始します..."

# 環境変数のチェック
if [ -z "$LINE_CHANNEL_ACCESS_TOKEN" ] || [ -z "$LINE_CHANNEL_SECRET" ]; then
  echo "⚠️  環境変数が設定されていません。以下を実行してください:"
  echo ""
  echo "export LINE_CHANNEL_ACCESS_TOKEN='your_token_here'"
  echo "export LINE_CHANNEL_SECRET='your_secret_here'"
  echo "export WEB_APP_URL='https://your-app-url.com'"
  echo ""
  exit 1
fi

echo ""
echo "📦 Step 1: データベースマイグレーション"
echo "----------------------------------------"
supabase db push

echo ""
echo "🔧 Step 2: Edge Functionsのデプロイ"
echo "----------------------------------------"

echo "  → send-line-notification をデプロイ中..."
supabase functions deploy send-line-notification

echo "  → line-webhook をデプロイ中..."
supabase functions deploy line-webhook

echo "  → daily-shift-reminder をデプロイ中..."
supabase functions deploy daily-shift-reminder

echo "  → send-emergency-shift をデプロイ中..."
supabase functions deploy send-emergency-shift

echo ""
echo "🔐 Step 3: 環境変数の設定"
echo "----------------------------------------"

echo "  → LINE_CHANNEL_ACCESS_TOKEN を設定中..."
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="$LINE_CHANNEL_ACCESS_TOKEN" --project-ref $SUPABASE_PROJECT_REF

echo "  → LINE_CHANNEL_SECRET を設定中..."
supabase secrets set LINE_CHANNEL_SECRET="$LINE_CHANNEL_SECRET" --project-ref $SUPABASE_PROJECT_REF

if [ -n "$WEB_APP_URL" ]; then
  echo "  → WEB_APP_URL を設定中..."
  supabase secrets set WEB_APP_URL="$WEB_APP_URL" --project-ref $SUPABASE_PROJECT_REF
fi

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "📋 次のステップ:"
echo "1. LINE Developersコンソールで以下のWebhook URLを設定:"
echo "   https://[YOUR_PROJECT_ID].supabase.co/functions/v1/line-webhook"
echo ""
echo "2. Webhook URLを検証して接続確認"
echo ""
echo "3. Cron Jobの設定（Supabaseダッシュボード）:"
echo "   - 前日リマインドを毎日20:00（JST）に実行"
echo ""
echo "4. フロントエンドのリビルド & デプロイ"
echo ""

