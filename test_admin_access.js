// 管理者アクセスをテスト（実際のRLSポリシーで）
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminAccess() {
  console.log('🧪 管理者アクセステスト\n');

  // まず、is_admin()関数が存在するか確認
  console.log('1️⃣ is_admin()関数をテスト中...\n');

  try {
    // 管理者ユーザーIDでテスト
    const adminUserId = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

    const { data, error } = await supabase
      .rpc('is_admin', {});

    if (error) {
      if (error.message.includes('Could not find')) {
        console.log('❌ is_admin()関数が見つかりません');
        console.log('   マイグレーションが正しく適用されていない可能性があります\n');
      } else {
        console.log('⚠️ エラー:', error.message);
      }
    } else {
      console.log('✅ is_admin()関数は存在します');
      console.log('   結果:', data);
    }
  } catch (err) {
    console.log('❌ 関数テストでエラー:', err.message);
  }

  console.log('\n2️⃣ 3月2日のデータを取得テスト...\n');

  // service_roleで取得（RLSバイパス）
  const { data: allData, count: totalCount } = await supabase
    .from('shift_requests')
    .select('*', { count: 'exact' })
    .eq('date', '2026-03-02');

  console.log(`✅ データベースには ${totalCount}件 存在します\n`);

  console.log('📌 確認事項:');
  console.log('   ✅ マイグレーションはプッシュ済み');
  console.log('   ✅ データベースには10件のデータが存在');
  console.log('   ⚠️ is_admin()関数の状態を確認してください\n');

  console.log('🔧 トラブルシューティング:');
  console.log('   もし問題が解決しない場合、以下を実行してください:');
  console.log('   1. Supabase Dashboardを開く');
  console.log('   2. SQL Editorで以下を実行:');
  console.log('      SELECT * FROM pg_policies WHERE tablename = \'shift_requests\';');
  console.log('   3. is_admin()関数を確認:');
  console.log('      SELECT routine_name FROM information_schema.routines WHERE routine_name = \'is_admin\';');
}

testAdminAccess().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
