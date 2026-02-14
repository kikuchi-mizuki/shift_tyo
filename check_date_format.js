// dateフィールドの実際の形式を確認
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM5OTY5OCwiZXhwIjoyMDcwOTc1Njk4fQ.fIg0kXyr6uNTymDebM2ZrY3xTuI53CJnHW9PBzrBnXE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDateFormat() {
  console.log('🔍 dateフィールドの形式を確認中...\n');

  // 最初の10件を取得
  const { data: sample } = await supabase
    .from('shift_requests')
    .select('id, date, created_at')
    .limit(10);

  console.log('📋 サンプルデータ（最初の10件）:');
  sample?.forEach((item, i) => {
    console.log(`\n${i + 1}.`);
    console.log(`   date: ${item.date}`);
    console.log(`   typeof date: ${typeof item.date}`);
    console.log(`   String(date): ${String(item.date)}`);
    console.log(`   includes('2026-03'): ${String(item.date).includes('2026-03')}`);
  });

  // 3月のデータを取得
  const { data: marchData } = await supabase
    .from('shift_requests')
    .select('date')
    .gte('date', '2026-03-01')
    .lt('date', '2026-04-01');

  console.log(`\n📊 .gte/.lt フィルタで取得した3月のデータ: ${marchData?.length}件\n`);

  // JavaScriptのString.includes()でフィルタ
  const { data: allData } = await supabase
    .from('shift_requests')
    .select('date')
    .limit(1000);

  const marchFiltered = allData?.filter(r => {
    const dateStr = String(r.date);
    return dateStr.includes('2026-03');
  });

  console.log(`📊 includes('2026-03') でフィルタした3月のデータ: ${marchFiltered?.length}件\n`);

  // 実際のdateの値のユニークな形式をチェック
  const dateFormats = new Set();
  allData?.slice(0, 100).forEach(r => {
    const dateStr = String(r.date);
    // 形式をパターンとして記録
    const pattern = dateStr.replace(/\d/g, 'X');
    dateFormats.add(pattern);
  });

  console.log('📋 dateフィールドの形式パターン:');
  dateFormats.forEach(pattern => {
    console.log(`   ${pattern}`);
  });

  // 3月2日のデータを確認
  const { data: march2 } = await supabase
    .from('shift_requests')
    .select('*')
    .eq('date', '2026-03-02');

  console.log(`\n📊 .eq('date', '2026-03-02') で取得: ${march2?.length}件\n`);

  if (march2 && march2.length > 0) {
    console.log('3月2日の最初のデータ:');
    console.log('   date:', march2[0].date);
    console.log('   typeof:', typeof march2[0].date);
  }
}

checkDateFormat().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
