// データベースのデータを直接確認するスクリプト
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

// service_roleキーを使用してRLSをバイパス
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMarch2Data() {
  console.log('📊 3月2日のshift_requestsデータを確認中...\n');

  // すべての3月2日のデータを取得（RLSバイパス）
  const { data, error, count } = await supabase
    .from('shift_requests')
    .select('*', { count: 'exact' })
    .eq('date', '2026-03-02')
    .order('created_at');

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log(`✅ 3月2日のデータ件数: ${count}件\n`);

  if (data && data.length > 0) {
    console.log('📋 データの詳細:');
    data.forEach((item, index) => {
      console.log(`\n${index + 1}. ID: ${item.id.substring(0, 8)}...`);
      console.log(`   pharmacist_id: ${item.pharmacist_id.substring(0, 8)}...`);
      console.log(`   date: ${item.date}`);
      console.log(`   time_slot: ${item.time_slot}`);
      console.log(`   start_time: ${item.start_time} - end_time: ${item.end_time}`);
      console.log(`   status: ${item.status}`);
      console.log(`   created_at: ${item.created_at}`);
    });
  } else {
    console.log('⚠️ データが見つかりませんでした');
  }

  // 3月全体のデータも確認
  const { count: marchCount } = await supabase
    .from('shift_requests')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2026-03-01')
    .lt('date', '2026-04-01');

  console.log(`\n📊 3月全体のデータ件数: ${marchCount}件`);

  // 日付ごとの集計
  const { data: dateGroups } = await supabase
    .from('shift_requests')
    .select('date')
    .gte('date', '2026-03-01')
    .lt('date', '2026-04-01');

  if (dateGroups) {
    const dateCounts = {};
    dateGroups.forEach(item => {
      const dateStr = String(item.date).split('T')[0];
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    console.log('\n📅 3月の日付別データ件数:');
    Object.entries(dateCounts).sort().forEach(([date, count]) => {
      console.log(`   ${date}: ${count}件`);
    });
  }
}

checkMarch2Data().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
