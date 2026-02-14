// RLSポリシーを確認するスクリプト
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 RLSポリシーを確認中...\n');

  // shift_requestsのポリシーを確認
  const { data: policies, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tablename,
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'shift_requests'
      ORDER BY cmd, policyname;
    `
  });

  if (error) {
    console.error('❌ ポリシー確認エラー:', error);
    console.log('\n別の方法でポリシーを確認します...\n');

    // 直接SQLクエリを実行
    const { data: rawData, error: rawError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'shift_requests');

    if (rawError) {
      console.error('❌ エラー:', rawError);
    } else {
      console.log('✅ ポリシー一覧:', rawData);
    }
    return;
  }

  console.log('✅ shift_requestsのRLSポリシー:', policies);

  // user_profilesのRLS状態を確認
  console.log('\n🔍 user_profilesのRLS状態を確認中...\n');

  const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = 'user_profiles';
    `
  });

  if (tableError) {
    console.error('❌ エラー:', tableError);
  } else {
    console.log('✅ user_profilesのRLS状態:', tableInfo);
  }

  // 管理者ユーザーを確認
  console.log('\n🔍 管理者ユーザーを確認中...\n');

  const { data: adminUsers, error: adminError } = await supabase
    .from('user_profiles')
    .select('id, name, email, user_type')
    .eq('user_type', 'admin');

  if (adminError) {
    console.error('❌ エラー:', adminError);
  } else {
    console.log('✅ 管理者ユーザー:', adminUsers);
  }

  // 現在ログイン中のユーザーが管理者か確認
  const currentUserId = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';
  const { data: currentUser, error: currentUserError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', currentUserId)
    .single();

  if (currentUserError) {
    console.error('❌ エラー:', currentUserError);
  } else {
    console.log('\n✅ 現在のユーザー情報:', currentUser);
  }
}

checkRLSPolicies().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
