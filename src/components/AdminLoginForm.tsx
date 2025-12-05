import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useMultiUserAuth } from '../contexts/MultiUserAuthContext';
import { auth, isProduction } from '../lib/supabase';
import { Shield } from 'lucide-react';

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    userType: 'admin' as 'pharmacist' | 'pharmacy' | 'admin'
  });
  const { addSession } = useMultiUserAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // パスワード長の検証
        if (password.length < 6) {
          setError('パスワードは6文字以上である必要があります。');
          setLoading(false);
          return;
        }

        // 新規登録処理
        if (!isProduction) {
          setError('デモ環境では新規登録はできません。管理者アカウントは事前に設定されています。');
          setLoading(false);
          return;
        }

        // 管理者登録の場合はuser_typeを'admin'に固定
        const userData = {
          name: registrationData.name,
          role: 'admin',
          user_type: 'admin'
        };
        
        console.log('Admin registration:', { email, userType: registrationData.userType, userData });
        
        const result = await auth.signUp(email.trim(), password, userData);
        
        if (result.error) {
          if (result.error.message?.includes('User already registered')) {
            setError('このメールアドレスは既に登録されています。ログインしてください。');
          } else {
            setError(result.error.message || '新規登録に失敗しました');
          }
        } else {
          console.log('Admin registration successful');
          setError('');
          setIsRegistering(false); // 登録完了後はログイン画面に戻る
        }
        setLoading(false);
        return;
      }
      
      // ログイン処理
      console.log('=== ADMIN LOGIN FORM SUBMITTED ===');
      console.log('Admin login attempt:', { email });

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Admin login error:', authError);
        setError(authError.message || 'ログインに失敗しました');
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('Admin login successful:', data.user.id);

        // デバッグ: セッション情報を確認
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session debug:', {
          hasSession: !!sessionData.session,
          sessionUserId: sessionData.session?.user?.id,
          accessToken: sessionData.session?.access_token?.substring(0, 20) + '...'
        });

        // デバッグ: auth.uid()を直接テスト
        console.log('Testing auth.uid() directly...');
        const { data: authUidTest, error: authUidError } = await supabase
          .rpc('auth_uid_test');

        console.log('auth.uid() test result:', {
          authUid: authUidTest,
          error: authUidError?.message
        });

        // デバッグ: RLSを無視してすべてのプロフィールを取得（service_roleで実行されないのでエラーになる）
        console.log('Attempting to fetch ALL profiles (should fail with RLS)...');
        const { data: allProfilesNoFilter, error: allNoFilterError } = await supabase
          .from('user_profiles')
          .select('id, email, user_type');

        console.log('All profiles result:', {
          success: !allNoFilterError,
          count: allProfilesNoFilter?.length || 0,
          error: allNoFilterError?.message
        });

        // デバッグ: まず .single() なしで試す
        console.log('Attempting to fetch profile without .single()...');
        const { data: allProfiles, error: allError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id);

        console.log('Profile fetch result (without .single()):', {
          success: !allError,
          count: allProfiles?.length || 0,
          error: allError?.message,
          profiles: allProfiles?.map(p => ({ id: p.id, email: p.email, user_type: p.user_type }))
        });

        if (allError) {
          console.error('Error fetching profiles (without .single()):', allError);
        }

        // ユーザープロフィールを取得して管理者権限を確認
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching admin profile:', profileError);
          console.log('Debug info:', {
            userId: data.user.id,
            errorCode: profileError.code,
            errorMessage: profileError.message,
            allProfilesCount: allProfiles?.length || 0
          });
          setError('ユーザープロフィールの取得に失敗しました');
          setLoading(false);
          return;
        }

        // 管理者権限の確認
        if (profile.user_type !== 'admin') {
          console.warn('Non-admin user attempted admin login:', profile.user_type);
          setError('管理者権限がありません。管理者としてログインする権限がありません。');
          await supabase.auth.signOut(); // ログアウト
          setLoading(false);
          return;
        }

        // 管理者セッションを追加
        await addSession(data.user, 'admin');
        
        console.log('Admin session added successfully');
        setError('');
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Admin login/registration error:', error);
      setError('処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AIシフトマネージャー</h1>
          </div>
          <h2 className="text-xl font-semibold text-purple-600 mb-2">
            {isRegistering ? '管理者新規登録' : '管理者ログイン'}
          </h2>
          <p className="text-gray-600">
            {isRegistering ? '管理者アカウントの新規作成' : ''}
          </p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">
                管理者メールアドレス
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="admin@example.com"
                disabled={loading}
              />
            </div>

            {/* 新規登録時の名前フィールド */}
            {isRegistering && (
              <div>
                <label htmlFor="admin-name" className="block text-sm font-medium text-gray-700 mb-2">
                  管理者名
                </label>
                <input
                  id="admin-name"
                  type="text"
                  required
                  value={registrationData.name}
                  onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="管理者名を入力"
                  disabled={loading}
                />
              </div>
            )}

            {/* パスワード */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="パスワード"
                disabled={loading}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>
                {loading ? (isRegistering ? '登録中...' : 'ログイン中...') : (isRegistering ? '管理者アカウント作成' : '管理者としてログイン')}
              </span>
            </button>
          </form>

          {/* ログイン/登録切り替え */}
          {isProduction && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-purple-600 hover:text-purple-800 text-sm underline"
              >
                {isRegistering ? 'すでにアカウントをお持ちの方はこちら' : '新規管理者アカウント作成はこちら'}
              </button>
            </div>
          )}

          {/* 一般ユーザーログインへのリンク */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm mb-3">
              一般ユーザー（薬剤師・薬局）の方はこちら
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              一般ログイン画面へ
            </button>
          </div>

          {/* セキュリティ注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-800 text-sm font-medium mb-1">セキュリティ注意事項</p>
                <p className="text-yellow-700 text-xs">
                  この画面は管理者専用です。管理者権限を持つユーザーのみアクセス可能です。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            AIシフトマネージャー - 管理者認証システム
          </p>
        </div>
      </div>
    </div>
  );
};
