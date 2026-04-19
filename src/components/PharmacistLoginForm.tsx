import React, { useState } from 'react';
import { User, LogIn, Pill } from 'lucide-react';
import { supabase, isProduction } from '../lib/supabase';
import { useMultiUserAuth } from '../contexts/MultiUserAuthContext';

interface PharmacistLoginFormProps {
  onLoginSuccess?: () => void;
  onPasswordReset?: () => void;
}

export const PharmacistLoginForm: React.FC<PharmacistLoginFormProps> = ({ onLoginSuccess, onPasswordReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const { addSession } = useMultiUserAuth();

  const userType = 'pharmacist' as const;

  // デモアカウント
  const demoAccount = {
    email: 'tanaka@pharmacist.com',
    password: 'demo123',
    name: '田中花子（薬剤師）',
    id: '0df8ba4e-1ecc-464f-9a7b-55a8d03cf2c8',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // 新規登録処理
        if (password.length < 6) {
          setError('パスワードは6文字以上である必要があります。');
          setLoading(false);
          return;
        }

        const userData = {
          name: name,
          role: userType,
          user_type: userType
        };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData
          }
        });

        if (error) {
          if (error.message?.includes('User already registered')) {
            setError('このメールアドレスは既に登録されています。ログインしてください。');
          } else {
            setError(error.message || '新規登録に失敗しました');
          }
          return;
        }

        if (data.user) {
          setError('');
          setIsRegistering(false);
          setEmail('');
          setPassword('');
          setName('');
          setError('新規登録が完了しました。ログインしてください。');
        }
        setLoading(false);
        return;
      }

      // ログイン処理
      // デモアカウントチェック
      if (email === demoAccount.email && password === demoAccount.password) {
        const mockUser = {
          id: demoAccount.id,
          email: demoAccount.email
        };
        await addSession(mockUser, userType);
        onLoginSuccess?.();
        setLoading(false);
        return;
      }

      // クライアントバリデーション
      if (!email || !password) {
        setError('メールアドレスとパスワードを入力してください');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(`認証エラー: ${error.message}`);
        return;
      }

      if (data.user) {
        // ユーザープロフィールを取得してユーザータイプを確認
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          await addSession(data.user, userType);
          onLoginSuccess?.();
          setLoading(false);
          return;
        }

        const actualUserType = profile.user_type as 'pharmacist' | 'pharmacy' | 'admin';

        // 管理者ユーザーの一般ログイン画面でのアクセスを拒否
        if (actualUserType === 'admin') {
          setError('管理者アカウントは専用のログイン画面をご利用ください。URL: /admin-login');
          return;
        }

        // 薬剤師以外のユーザータイプをチェック
        if (actualUserType !== userType) {
          setError('このアカウントは薬剤師用ではありません。薬局の方は薬局ログイン画面をご利用ください。');
          return;
        }

        await addSession(data.user, actualUserType);
        onLoginSuccess?.();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              薬剤師ログイン
            </h1>
          </div>
          <p className="text-sm text-gray-600">AIシフトマネージャー</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isRegistering ? '新規登録' : 'ログイン'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
              }}
              className="text-sm text-green-600 hover:text-green-800 underline"
            >
              {isRegistering ? 'ログインに戻る' : '新規登録'}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 名前（新規登録時のみ） */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegistering}
                  autoComplete="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="お名前を入力"
                />
              </div>
            )}

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="example@email.com"
              />
            </div>

            {/* パスワード */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                {!isRegistering && onPasswordReset && (
                  <button
                    type="button"
                    onClick={onPasswordReset}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    パスワードを忘れた方
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="パスワード"
              />
              {isRegistering && (
                <p className="text-xs text-gray-500 mt-1">パスワードは6文字以上で入力してください</p>
              )}
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
              className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>
                {loading
                  ? (isRegistering ? '登録中...' : 'ログイン中...')
                  : isRegistering
                    ? '薬剤師として新規登録'
                    : '薬剤師としてログイン'
                }
              </span>
            </button>
          </form>

          {/* 薬局ログインへのリンク */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              薬局の方は
              <button
                onClick={() => window.location.href = '/pharmacy-login'}
                className="ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                薬局ログイン画面
              </button>
            </p>
          </div>
        </div>

        {/* デモアカウント */}
        {!isProduction && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">デモアカウント</h3>
            <button
              onClick={() => {
                setEmail(demoAccount.email);
                setPassword(demoAccount.password);
                setError('');
              }}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-all hover:shadow-md text-green-600 bg-green-50 border-green-200"
            >
              <User className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-medium">{demoAccount.name}</div>
                <div className="text-sm opacity-75">{demoAccount.email}</div>
              </div>
              <div className="text-xs opacity-75">クリックで入力</div>
            </button>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>注意:</strong> デモ環境では上記のアカウントのみ使用できます。
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
