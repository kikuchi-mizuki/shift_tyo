#!/bin/bash

# 孤立したauth.usersを一括削除するスクリプト

SUPABASE_URL="https://wjgterfwurmvosawzbjs.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE"

echo "🧹 孤立したauth.usersを一括削除します..."
echo ""

curl -X POST \
  "${SUPABASE_URL}/functions/v1/cleanup-orphaned-users" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data '{}' \
  | jq '.'

echo ""
echo "✅ 完了"
