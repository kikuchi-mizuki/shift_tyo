// 表示されている1件と他の9件の違いを調査
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigate() {
  console.log('🔍 表示されている1件と他の9件の違いを調査中...\n');

  // 管理者ユーザーID
  const adminUserId = '0e665ba6-06ae-48eb-be73-eba61d72d6b3';

  // フロントエンドのログから、表示されているのはこの1件
  const visibleRecordId = '06727cdb-5c7f-4fa1-ad76-45855b64b663';
  const visiblePharmacistId = 'bb656f0f-250f-43d4-bc68-c4214166f6b8';

  console.log('👤 管理者ユーザーID:', adminUserId);
  console.log('✅ 表示されているレコードのID:', visibleRecordId);
  console.log('✅ 表示されているレコードのpharmacist_id:', visiblePharmacistId);
  console.log('');

  // この管理者ユーザーが薬剤師プロフィールも持っているか確認
  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', adminUserId)
    .single();

  console.log('📋 管理者プロフィール:');
  console.log('   ID:', adminProfile?.id);
  console.log('   名前:', adminProfile?.name);
  console.log('   user_type:', adminProfile?.user_type);
  console.log('');

  // 表示されている薬剤師のプロフィールを確認
  const { data: visiblePharmacist } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', visiblePharmacistId)
    .single();

  console.log('📋 表示されている薬剤師のプロフィール:');
  console.log('   ID:', visiblePharmacist?.id);
  console.log('   名前:', visiblePharmacist?.name);
  console.log('   user_type:', visiblePharmacist?.user_type);
  console.log('   email:', visiblePharmacist?.email);
  console.log('');

  // 3月2日の全レコードを取得
  const { data: allRecords } = await supabase
    .from('shift_requests')
    .select('*')
    .eq('date', '2026-03-02')
    .order('created_at');

  console.log('📊 3月2日の全レコード（10件）:\n');

  for (let i = 0; i < allRecords.length; i++) {
    const record = allRecords[i];
    const isVisible = record.id === visibleRecordId;

    // 薬剤師プロフィールを取得
    const { data: pharmacist } = await supabase
      .from('user_profiles')
      .select('name, email, user_type')
      .eq('id', record.pharmacist_id)
      .single();

    console.log(`${i + 1}. ${isVisible ? '✅ 表示される' : '❌ 表示されない'}`);
    console.log(`   レコードID: ${record.id.substring(0, 8)}...`);
    console.log(`   pharmacist_id: ${record.pharmacist_id.substring(0, 8)}...`);
    console.log(`   薬剤師名: ${pharmacist?.name || '不明'}`);
    console.log(`   薬剤師タイプ: ${pharmacist?.user_type || '不明'}`);
    console.log(`   日付: ${record.date}`);
    console.log(`   time_slot: ${record.time_slot}`);
    console.log(`   status: ${record.status}`);

    // 管理者IDと一致するか確認
    if (record.pharmacist_id === adminUserId) {
      console.log('   ⚠️ このレコードのpharmacist_idは管理者IDと一致！');
    }

    console.log('');
  }

  // 重要な発見を要約
  console.log('📌 重要な発見:');
  console.log('');

  if (visiblePharmacistId === adminUserId) {
    console.log('✅ 表示されているレコードのpharmacist_idは管理者IDと一致しています');
    console.log('   つまり、RLSポリシーの「pharmacist_id = auth.uid()」が真になっている');
    console.log('   管理者が自分自身の薬剤師リクエストを作成したため表示されています');
    console.log('');
    console.log('❌ 問題: RLSポリシーの管理者チェック（EXISTS句）が動作していない');
    console.log('   管理者は全てのレコードを見られるべきですが、自分のレコードしか見られません');
  } else {
    console.log('⚠️ 表示されているレコードのpharmacist_idは管理者IDと一致しません');
    console.log('   別の理由で表示されている可能性があります');
  }
}

investigate().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
