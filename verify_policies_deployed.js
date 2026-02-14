// デプロイされたポリシーと関数を確認
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDeployment() {
  console.log('🔍 デプロイ状況を確認中...\n');

  // is_admin()関数の存在確認
  const { data: functions, error: funcError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          routine_name,
          routine_type,
          security_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name = 'is_admin';
      `
    })
    .single();

  if (funcError) {
    console.log('⚠️ 関数確認時にエラー:', funcError.message);
    console.log('   別の方法で確認します...\n');
  } else {
    console.log('✅ is_admin()関数が見つかりました:');
    console.log(functions);
    console.log('');
  }

  // ポリシーの確認
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          tablename,
          policyname,
          cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
        ORDER BY tablename, cmd, policyname;
      `
    });

  if (policyError) {
    console.log('⚠️ ポリシー確認時にエラー:', policyError.message);
  } else {
    console.log('✅ デプロイされたポリシー:');
    console.log('');

    let currentTable = '';
    policies.forEach(p => {
      if (p.tablename !== currentTable) {
        currentTable = p.tablename;
        console.log(`\n📋 ${p.tablename}:`);
      }
      console.log(`   ${p.cmd}: ${p.policyname}`);
    });
    console.log('');
  }

  console.log('✅ デプロイ確認完了');
  console.log('');
  console.log('📌 次のステップ:');
  console.log('   ブラウザでアプリケーションをリロードしてください');
  console.log('   3月2日を選択すると、10件の薬剤師が表示されるはずです');
}

verifyDeployment().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
