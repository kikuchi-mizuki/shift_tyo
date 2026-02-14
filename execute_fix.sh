#!/bin/bash
# Execute RLS fix via Supabase project connection string

PROJECT_REF="wjgterfwurmvosawzbjs"
SQL_FILE="supabase/migrations/20260214000001_fix_admin_rls_policy_v2.sql"

echo "🚀 Executing RLS fix..."
echo ""
echo "⚠️  This requires the database password from Supabase Dashboard:"
echo "   Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "   Copy the connection string (with password)"
echo ""
echo "Then run:"
echo "   psql 'YOUR_CONNECTION_STRING' -f $SQL_FILE"
echo ""
echo "Or execute this SQL in Supabase Dashboard SQL Editor:"
echo "----------------------------------------"
cat "$SQL_FILE"
echo "----------------------------------------"
