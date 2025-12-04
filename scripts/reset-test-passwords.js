/**
 * テストアカウントのパスワードリセットスクリプト
 * 使用方法: node scripts/reset-test-passwords.js
 *
 * 注意: このスクリプトはService Role Keyが必要です
 * Supabaseダッシュボード → Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';

// Service Role Keyが必要（環境変数から取得）
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません');
  console.log('\n手順:');
  console.log('1. Supabaseダッシュボード → Settings → API → service_role key をコピー');
  console.log('2. 以下のコマンドで実行:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_key node scripts/reset-test-passwords.js\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// リセットするテストアカウント
const testAccounts = [
  '01@test.com',
  '02@test.com',
  '03@test.com',
  '04@test.com'
];

// 新しいパスワード
const newPassword = 'test123';

async function resetPasswords() {
  console.log('========================================');
  console.log('テストアカウント パスワードリセット');
  console.log('========================================\n');
  console.log(`新しいパスワード: ${newPassword}\n`);

  for (const email of testAccounts) {
    try {
      // ユーザーIDを取得
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        console.log(`❌ ${email} - プロフィールが見つかりません`);
        continue;
      }

      // パスワードを更新（Admin API使用）
      const { data, error } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password: newPassword }
      );

      if (error) {
        console.log(`❌ ${email} - パスワード更新失敗: ${error.message}`);
      } else {
        console.log(`✅ ${email} - パスワード更新成功`);
      }
    } catch (error) {
      console.log(`❌ ${email} - エラー: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('完了');
  console.log('========================================\n');
  console.log(`パスワード: ${newPassword}`);
  console.log('で全テストアカウントにログインできます。\n');
}

resetPasswords();
