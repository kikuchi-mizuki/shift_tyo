/**
 * ユーザー確認スクリプト
 * 使用方法: node scripts/check-users.js
 */

import { createClient } from '@supabase/supabase-js';

// 環境変数またはフォールバック値
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTk2OTgsImV4cCI6MjA3MDk3NTY5OH0.bDs2CtZ9dJOeN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  console.log('========================================');
  console.log('ユーザー確認スクリプト');
  console.log('========================================\n');

  try {
    // 1. 全ユーザープロフィールを取得
    console.log('📋 ユーザープロフィール一覧:');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, name, user_type, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ エラー:', profilesError.message);
    } else {
      console.log(`\n✅ 全ユーザー数: ${profiles.length}件\n`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.email}`);
        console.log(`   名前: ${profile.name || '未設定'}`);
        console.log(`   タイプ: ${profile.user_type}`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   作成日: ${new Date(profile.created_at).toLocaleString('ja-JP')}`);
        console.log('');
      });
    }

    // 2. タイプ別集計
    console.log('\n📊 ユーザータイプ別集計:');
    const types = ['pharmacist', 'store', 'admin'];
    for (const type of types) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', type);

      if (!error) {
        const count = data?.length || 0;
        const typeLabel = type === 'pharmacist' ? '薬剤師' : type === 'store' ? '薬局' : '管理者';
        console.log(`  ${typeLabel}: ${count}件`);
      }
    }

    // 3. 特定のメールアドレスを検索
    console.log('\n\n🔍 特定のメールアドレスを検索:');
    const searchEmail = '01@test.com';
    const { data: searchResult, error: searchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', searchEmail);

    if (searchError) {
      console.error(`❌ エラー: ${searchError.message}`);
    } else if (searchResult && searchResult.length > 0) {
      console.log(`✅ ${searchEmail} が見つかりました:`);
      console.log(JSON.stringify(searchResult[0], null, 2));
    } else {
      console.log(`❌ ${searchEmail} は見つかりませんでした`);
      console.log('   → 新規登録が必要です');
    }

    // 4. シフトデータの統計
    console.log('\n\n📈 データベース統計:');

    const tables = [
      { name: 'user_profiles', label: 'ユーザープロフィール' },
      { name: 'shift_requests', label: 'シフトリクエスト' },
      { name: 'shift_postings', label: 'シフト募集' },
      { name: 'assigned_shifts', label: '確定シフト' },
      { name: 'pharmacist_ratings', label: '薬剤師評価' }
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`  ${table.label}: ${count}件`);
      }
    }

    console.log('\n========================================');
    console.log('確認完了');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

// スクリプト実行
checkUsers();
