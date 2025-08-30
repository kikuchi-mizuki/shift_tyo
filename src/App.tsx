import React, { useState, useEffect, Component, ReactNode } from 'react';
import { supabase, auth } from './lib/supabase';
import LoginForm from './components/LoginForm';
import UserDashboard from './components/UserDashboard';
import PharmacistDashboard from './components/PharmacistDashboard';
import PharmacyDashboard from './components/PharmacyDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminPanel from './components/AdminPanel';
import AdminMatchingPanel from './components/AdminMatchingPanel';
import UserManagement from './components/UserManagement';
import { useAuth } from './hooks/useAuth';

// エラーバウンダリーコンポーネント
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-red-600 mb-4">
            コンポーネントの読み込み中にエラーが発生しました。
          </p>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer">エラー詳細</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log('App: Component rendering - START');
  
  try {
    const { user, userProfile, loading, signOut } = useAuth();
    
    console.log('App: useAuth result:', {
      user: !!user,
      userProfile: !!userProfile,
      loading,
      userProfileType: userProfile?.user_type,
      userMetadataType: user?.user_metadata?.user_type
    });
    
    console.log('App: Component rendering - SUCCESS');
    
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <LoginForm onLoginSuccess={() => {}} />;
    }

    // ユーザータイプの判定（優先順位: userProfile > user_metadata > デフォルト）
    let userType: 'pharmacist' | 'pharmacy' | 'admin' | 'store';
    
    if (userProfile?.user_type) {
      userType = userProfile.user_type;
    } else if (user.user_metadata?.user_type) {
      userType = user.user_metadata.user_type;
    } else if (user.user_metadata?.role) {
      userType = user.user_metadata.role;
    } else {
      userType = 'pharmacist'; // デフォルト
    }
    
    // デバッグ: ユーザータイプの詳細情報
    console.log('User type debug:', {
      userProfileType: userProfile?.user_type,
      userMetadataType: user.user_metadata?.user_type,
      finalUserType: userType,
      userProfile: userProfile,
      userMetadata: user.user_metadata
    });

    return (
      <div className="min-h-screen bg-gray-100">
        {/* デバッグ情報 */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 m-4 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">デバッグ情報</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>ユーザーID: {user.id}</div>
              <div>メール: {user.email}</div>
              <div>ユーザータイプ: {userType}</div>
              <div>プロファイル由来: {String(!!userProfile)}</div>
            </div>
          </div>
        )}
        
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">シ</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  シフト調整システム
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <span className="text-sm text-gray-500">
                  {userType === 'pharmacist' ? '薬剤師' : (userType === 'pharmacy' || userType === 'store') ? '薬局' : userType === 'admin' ? '管理' : 'ユーザー'}
                </span>
                <button
                  onClick={signOut}
                  className="text-gray-400 hover:text-gray-600"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorBoundary>
            {userType === 'pharmacist' && (
              <PharmacistDashboard user={user} />
            )}
            {(userType === 'pharmacy' || userType === 'store') && (
              <PharmacyDashboard user={user} />
            )}
            {userType === 'admin' && (
              <AdminDashboard user={user} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    );
    } catch (error) {
    console.error('App: Error in component:', error);
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800">エラーが発生しました</h1>
          <p className="text-red-600 mt-2">コンソールを確認してください</p>
        </div>
      </div>
    );
  }
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'matching' | 'management'>('dashboard');
  // ローディングが続く場合のフェイルセーフ（6秒で有効化）
  const [forceFallback, setForceFallback] = useState(false);
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setForceFallback(true), 6000);
      return () => clearTimeout(t);
    } else {
      setForceFallback(false);
    }
  }, [loading]);

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading && !forceFallback) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={() => {}} />;
  }

  // ユーザータイプの判定（優先順位: userProfile > user_metadata > デフォルト）
  let userType: 'pharmacist' | 'pharmacy' | 'admin' | 'store';
  
  if (userProfile?.user_type) {
    userType = userProfile.user_type;
  } else if (user.user_metadata?.user_type) {
    userType = user.user_metadata.user_type;
  } else if (user.user_metadata?.role) {
    userType = user.user_metadata.role;
  } else {
    userType = 'pharmacist'; // デフォルト
  }
  
  // デバッグ: ユーザータイプの詳細情報
  console.log('User type debug:', {
    userProfileType: userProfile?.user_type,
    userMetadataType: user.user_metadata?.user_type,
    finalUserType: userType,
    userProfile: userProfile,
    userMetadata: user.user_metadata
  });
  const showDebug = import.meta.env.DEV; // 開発時のみ表示

  return (
    <div className="min-h-screen bg-gray-100">
      {/* デバッグ情報 */}
      {showDebug && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 m-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">デバッグ情報</h3>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>ユーザーID: {user.id}</div>
            <div>メール: {user.email}</div>
            <div>ユーザータイプ: {userType}</div>
            <div>プロファイル由来: {String(!!userProfile)}</div>
            <div>forceFallback: {String(forceFallback)}</div>
            <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '設定済み' : '未設定'}</div>
            <div>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}</div>
          </div>
        </div>
      )}
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">シ</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                シフト調整システム
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <span className="text-sm text-gray-500">
                {userType === 'pharmacist' ? '薬剤師' : (userType === 'pharmacy' || userType === 'store') ? '薬局' : userType === 'admin' ? '管理' : 'ユーザー'}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <ErrorBoundary>
          {userType === 'pharmacist' && (
            <PharmacistDashboard user={user} />
          )}
          {(userType === 'pharmacy' || userType === 'store') && (
            <PharmacyDashboard user={user} />
          )}
          {userType === 'admin' && (
            <AdminDashboard user={user} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;