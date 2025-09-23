import React, { useState, useEffect } from 'react';
import { User, Building, Shield, LogIn, Pill } from 'lucide-react';
import { supabase, isProduction } from '../lib/supabase';
import { useMultiUserAuth } from '../contexts/MultiUserAuthContext';

interface MultiUserLoginFormProps {
  onLoginSuccess?: () => void;
}

export const MultiUserLoginForm: React.FC<MultiUserLoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'pharmacist' | 'pharmacy' | 'admin'>('pharmacist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  
  const { addSession, isLoggedIn, activeSessions } = useMultiUserAuth();

  // コンポーネントマウント時のデバッグ情報
  useEffect(() => {
    console.log('=== LOGIN FORM MOUNTED ===');
    console.log('MultiUserLoginForm mounted:', { 
      isProduction, 
      activeSessions: activeSessions.length,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      localStorage: typeof(Storage) !== "undefined",
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });

    // フォームが正常にマウントされたことを確認
    try {
      const testElement = document.querySelector('form');
      console.log('Form element found:', !!testElement);
      
      // PC環境の検出
      const isPC = window.innerWidth >= 1024 || navigator.platform.includes('Win') || navigator.platform.includes('Mac');
      console.log('Device type detection:', { isPC, width: window.innerWidth, platform: navigator.platform });
    } catch (e) {
      console.error('Error checking form element:', e);
    }
  }, []);

  // デモアカウント（本番環境でも表示）
  const demoAccounts = [
    { 
      email: 'tanaka@pharmacist.com', 
      password: 'demo123', 
      name: '田中花子（薬剤師）', 
      type: 'pharmacist' as const,
      icon: Pill,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      email: 'sakura@pharmacy.com', 
      password: 'demo123', 
      name: 'さくら薬局', 
      type: 'pharmacy' as const,
      icon: Building,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    { 
      email: 'admin@system.com', 
      password: 'admin123', 
      name: 'システム管理者', 
      type: 'admin' as const,
      icon: Shield,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== LOGIN FORM SUBMITTED ===');
    console.log('Form data:', { email, password, userType, isRegistering });
    setLoading(true);
    setError('');

    // 非同期でログイン処理を実行（UIのブロックを防ぐ）
    setTimeout(async () => {
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

          console.log('Registering new user:', { email, userType, userData });

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
            // 登録完了メッセージ
            setError('新規登録が完了しました。ログインしてください。');
          }
          setLoading(false);
          return;
        }

        // ログイン処理
        console.log('Attempting login with:', { email, userType });
        
        // デモ環境の場合はデモアカウント認証
        if (!isProduction) {
          const demoAccount = demoAccounts.find(acc => 
            acc.email === email && acc.password === password && acc.type === userType
          );

          if (demoAccount) {
            // デモアカウントでのログイン成功
            const mockUser = {
              id: `demo-${demoAccount.type}-${Date.now()}`,
              email: demoAccount.email
            };

            const mockProfile = {
              id: mockUser.id,
              name: demoAccount.name,
              email: demoAccount.email,
              user_type: demoAccount.type
            };

            // セッションを追加
            await addSession(mockUser);
            
            // フォームをリセット
            setEmail('');
            setPassword('');
            
            onLoginSuccess?.();
            setLoading(false);
            return;
          } else {
            setError('ログインに失敗しました。デモアカウントをご利用ください。');
            setLoading(false);
            return;
          }
        }

        console.log('Attempting Supabase authentication...');
        console.log('Auth request details:', {
          email: email,
          hasPassword: !!password,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          isPC: window.innerWidth >= 1024
        });
        
        // PC環境での追加デバッグ
        if (window.innerWidth >= 1024) {
          console.log('PC環境でのログイン試行:', {
            screenSize: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            cookieEnabled: navigator.cookieEnabled,
            localStorage: typeof(Storage) !== "undefined"
          });
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Supabase auth error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            email: email,
            hasPassword: !!password,
            errorCode: error.code,
            errorDetails: error,
            userAgent: navigator.userAgent,
            isPC: window.innerWidth >= 1024
          });
          
          // PC環境での具体的なエラーメッセージ
          let errorMessage = `認証エラー: ${error.message}`;
          if (window.innerWidth >= 1024) {
            errorMessage += ` (PC環境)`;
          }
          setError(errorMessage);
          return;
        }

        console.log('Supabase auth successful:', data.user?.id);

        if (data.user) {
          // ユーザープロフィールを取得してユーザータイプを確認
          console.log('Fetching user profile for:', data.user.id);
          console.log('PC環境でのプロフィール取得:', {
            userId: data.user.id,
            userEmail: data.user.email,
            isPC: window.innerWidth >= 1024
          });
          
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            console.error('PC環境でのプロフィール取得エラー:', {
              error: profileError,
              userId: data.user.id,
              isPC: window.innerWidth >= 1024
            });
            // プロフィール取得に失敗しても、選択中のユーザータイプで継続
            console.warn('Falling back to selected userType due to profile fetch failure');
            await addSession(data.user, userType);
            setEmail('');
            setPassword('');
            onLoginSuccess?.();
            setLoading(false);
            return;
          }

          console.log('User profile:', profile);
          const actualUserType = profile.user_type as 'pharmacist' | 'pharmacy' | 'admin';
          
          // 選択されたユーザータイプと実際のユーザータイプが一致するかチェック
          if (actualUserType !== userType) {
            setError(`このアカウントは${getUserTypeLabel(actualUserType)}用です。正しいユーザータイプを選択してください。`);
            console.error('User type mismatch:', { selected: userType, actual: actualUserType });
            return;
          }

          // セッションを追加
          try {
            console.log('Adding session for user:', data.user.id);
            console.log('PC環境でのセッション追加試行:', {
              userId: data.user.id,
              userType: actualUserType,
              isPC: window.innerWidth >= 1024
            });
            
            await addSession(data.user, actualUserType);
            
            // フォームをリセット
            setEmail('');
            setPassword('');
            
            console.log('Login successful, calling onLoginSuccess');
            onLoginSuccess?.();
          } catch (sessionError) {
            console.error('Session creation error:', sessionError);
            console.error('PC環境でのセッション追加エラー:', {
              error: sessionError,
              userId: data.user.id,
              isPC: window.innerWidth >= 1024
            });
            setError(`セッションの作成に失敗しました: ${sessionError.message || 'Unknown error'}`);
            return;
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        setError('ログインに失敗しました');
      } finally {
        setLoading(false);
      }
    }, 0); // setTimeoutの閉じ括弧
  };

  const getUserTypeLabel = (type: 'pharmacist' | 'pharmacy' | 'admin') => {
    switch (type) {
      case 'pharmacist': return '薬剤師';
      case 'pharmacy': return '薬局';
      case 'admin': return '管理者';
    }
  };

  const getUserTypeIcon = (type: 'pharmacist' | 'pharmacy' | 'admin') => {
    switch (type) {
      case 'pharmacist': return <User className="w-5 h-5" />;
      case 'pharmacy': return <Building className="w-5 h-5" />;
      case 'admin': return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">シ</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              シフト調整システム
            </h1>
          </div>
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
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {isRegistering ? 'ログインに戻る' : '新規登録'}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* ユーザータイプ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ユーザータイプ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['pharmacist', 'pharmacy', 'admin'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUserType(type)}
                    disabled={false}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                      userType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {getUserTypeIcon(type)}
                    <span className="text-sm">{getUserTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 名前（新規登録時のみ） */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前・企業名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegistering}
                  autoComplete="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="お名前または企業名を入力"
                />
              </div>
            )}

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="multi-login-email"
                name="multi-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="example@email.com"
              />
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="multi-login-password"
                name="multi-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onClick={() => console.log('Login button clicked:', { email, userType, isRegistering })}
              className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>
                {loading 
                  ? (isRegistering ? '登録中...' : 'ログイン中...')
                  : isRegistering
                    ? `${getUserTypeLabel(userType)}として新規登録`
                    : `${getUserTypeLabel(userType)}としてログイン`
                }
              </span>
            </button>
          </form>
        </div>

        {/* デモアカウント */}
        {!isProduction && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">デモアカウント</h3>
            <div className="space-y-3">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setUserType(account.type);
                    setError('');
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-all hover:shadow-md ${account.color}`}
                >
                  <account.icon className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm opacity-75">{account.email}</div>
                  </div>
                  <div className="text-xs opacity-75">クリックで入力</div>
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
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
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
