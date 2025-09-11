import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Pill, Building2, Shield } from 'lucide-react';
import { auth, isProduction } from '../lib/supabase';
import { User } from '../types';

interface LoginFormProps {
  onLogin: (user: any, userProfile: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    userType: 'pharmacist' as 'pharmacist' | 'pharmacy' | 'admin',
    pharmacyId: ''
  });

  // デモアカウント（本番環境でも表示）
  const demoAccounts = [
    { 
      email: 'tanaka@pharmacist.com', 
      password: 'demo123', 
      name: '田中花子（薬剤師）', 
      type: 'pharmacist',
      icon: Pill,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      email: 'sakura@pharmacy.com', 
      password: 'demo123', 
      name: 'さくら薬局', 
      type: 'pharmacy',
      icon: Building2,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    { 
      email: 'admin@system.com', 
      password: 'admin123', 
      name: 'システム管理者', 
      type: 'admin',
      icon: Shield,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // パスワード長の検証
        if (password.length < 6) {
          setError('パスワードは6文字以上である必要があります。');
          setIsLoading(false);
          return;
        }

        // 新規登録処理
        if (!isProduction) {
          setError('デモ環境では新規登録はできません。デモアカウントをご利用ください。');
          setIsLoading(false);
          return;
        }

        // フォームの値をDBスキーマに合わせてマッピング
        const dbRole = registrationData.userType === 'pharmacist' ? 'pharmacist'
                     : registrationData.userType === 'pharmacy'   ? 'pharmacy'
                     : registrationData.userType === 'admin'      ? 'admin'
                     : 'pharmacist'; // デフォルト

        const userData = {
          name: registrationData.name,
          role: dbRole,           // ← DBスキーマに合わせた値 (pharmacist/store/admin)
          user_type: dbRole       // ← 同じ値を設定
        };
        
        // デバッグ用ログ
        console.log('signUp args', { email, pw: !!password, userType: registrationData.userType, dbRole, meta: userData });
        
        const result = await auth.signUp(email.trim(), password, userData);
        
        if (result.error) {
          if (result.error.message?.includes('User already registered')) {
            setError('このメールアドレスは既に登録されています。ログインしてください。');
          } else {
            setError(result.error.message || '新規登録に失敗しました');
          }
        } else {
          console.log('Registration successful');
          console.log('User type registered:', registrationData.userType);
          console.log('Registration result:', result);
          setError('');
          // 通知は不要
          setIsRegistering(false); // 登録完了後はログイン画面に戻る
        }
        setIsLoading(false);
        return;
      }
      
      // ログイン処理
      if (isProduction) {
        // 本番環境：Supabase認証
        const result = await auth.signIn(email, password);
        
        if (result.error) {
          // デモアカウントかどうかチェック
          const isDemoAccount = demoAccounts.some(acc => acc.email === email);
          if (isDemoAccount) {
            setError('デモアカウントは本番環境では使用できません。新規アカウントを作成してください。');
          } else {
            setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
          }
        } else {
          setError('');
          // ログイン成功時の処理はuseAuthフックで自動的に処理される
        }
      } else {
        // デモ環境：デモアカウント認証
        const demoAccount = demoAccounts.find(acc => 
          acc.email === email && acc.password === password
        );

        if (demoAccount) {
          // デモアカウントでのログイン成功
          const mockUser = {
            id: `demo-${demoAccount.type}`,
            email: demoAccount.email
          };

          const mockProfile = {
            id: mockUser.id,
            name: demoAccount.name,
            email: demoAccount.email,
            type: demoAccount.type,
            user_type: demoAccount.type,
            specialties: demoAccount.type === 'pharmacist' ? ['調剤', '服薬指導'] : null,
            ng_list: []
          };

          onLogin(mockUser, mockProfile);
          setError('');
        } else {
          setError('ログインに失敗しました。デモアカウントをご利用ください。');
        }
      }
    } catch (err) {
      console.warn('Login error:', err);
      setError('ログイン処理中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Pill className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            シフト調整システム
          </h1>
          <p className="text-gray-600">
            フリーランス薬剤師と薬局店舗の効率的なシフト管理
          </p>
          {!isProduction && (
            <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full inline-block">
              デモ環境
            </div>
          )}
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{isRegistering ? '新規登録' : 'ログイン'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>
            
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名前・企業名
                </label>
                <input
                  type="text"
                  value={registrationData.name}
                  onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="お名前または企業名を入力"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="パスワードを入力"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ユーザー種別
                  </label>
                  <select
                    value={registrationData.userType}
                    onChange={(e) => setRegistrationData({...registrationData, userType: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="pharmacist">薬剤師</option>
                    <option value="pharmacy">薬局</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? (isRegistering ? '登録中...' : 'ログイン中...') : (isRegistering ? '新規登録' : 'ログイン')}</span>
            </button>
          </form>
          
          {isProduction && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                {isRegistering ? 'すでにアカウントをお持ちの方はこちら' : '新規アカウント作成はこちら'}
              </button>
            </div>
          )}
        </div>

        {/* デモアカウント */}
        {!isProduction && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">デモアカウント</h3>
            <div className="space-y-3">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(account)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-all hover:shadow-md ${account.color}`}
                >
                  <account.icon className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm opacity-75">{account.email}</div>
                  </div>
                  <div className="text-xs opacity-75">クリックでログイン</div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>注意:</strong> デモ環境では上記のアカウントのみ使用できます。
            </div>
          </div>
        )}

        {/* 本番環境での説明 */}
        {isProduction && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">本番環境</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 新規アカウントを作成してご利用ください</p>
              <p>• メールアドレスとパスワードでログインできます</p>
              <p>• セキュアな認証システムを使用しています</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;