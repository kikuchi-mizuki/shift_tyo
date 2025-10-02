import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useMultiUserAuth } from '../contexts/MultiUserAuthContext';

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addSession } = useMultiUserAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== ADMIN LOGIN FORM SUBMITTED ===');
    console.log('Admin login attempt:', { email });
    setLoading(true);
    setError('');

    try {
      // 管理者ログイン処理
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
        
        // ユーザープロフィールを取得して管理者権限を確認
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching admin profile:', profileError);
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
      console.error('Admin login error:', error);
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 管理者ロゴエリア */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">管理者ログイン</h1>
          <p className="text-blue-200">システム管理用の認証画面</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* メールアドレス */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-white mb-2">
                管理者メールアドレス
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="admin@example.com"
                disabled={loading}
              />
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-white mb-2">
                パスワード
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ログイン中...
                </div>
              ) : (
                '管理者としてログイン'
              )}
            </button>
          </form>

          {/* 一般ユーザーログインへのリンク */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-center text-blue-200 text-sm mb-3">
              一般ユーザー（薬剤師・薬局）の方はこちら
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-white/30"
            >
              一般ログイン画面へ
            </button>
          </div>

          {/* セキュリティ注意事項 */}
          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-300 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-200 text-sm font-medium mb-1">セキュリティ注意事項</p>
                <p className="text-yellow-100 text-xs">
                  この画面は管理者専用です。管理者権限を持つユーザーのみアクセス可能です。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8">
          <p className="text-blue-200 text-sm">
            AIシフトマネージャー - 管理者認証システム
          </p>
        </div>
      </div>
    </div>
  );
};
