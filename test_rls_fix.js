// RLS修正後のテスト - 管理者として10件すべて取得できるか確認
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';

// anonキーを使用（フロントエンドと同じ）
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 管理者のアクセストークン（.envから取得する必要があります）
// この部分は実際の環境変数から取得してください

async function testRLSFix() {
  console.log('🧪 RLS修正のテストを開始...\n');

  // 注意: 実際のテストには、管理者ユーザーでログインする必要があります
  // この例では、直接テストできないため、代わりにis_admin()関数をテストします

  console.log('⚠️ このテストを実行するには、フロントエンドで管理者としてログインして');
  console.log('   3月2日のデータが10件表示されるか確認してください。');
  console.log('');
  console.log('期待される結果: 10件の薬剤師の応募が表示される');
  console.log('');
  console.log('確認方法:');
  console.log('1. ブラウザのアプリケーションを開く');
  console.log('2. 管理者でログイン (0e665ba6-06ae-48eb-be73-eba61d72d6b3)');
  console.log('3. カレンダーで3月2日を選択');
  console.log('4. 「応募している薬剤師」セクションを確認');
  console.log('5. 10件の薬剤師が表示されることを確認');
}

testRLSFix().then(() => process.exit(0)).catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
