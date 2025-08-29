import React, { useState, useEffect } from 'react';
import { supabase, auth } from './lib/supabase';
import LoginForm from './components/LoginForm';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import AdminMatchingPanel from './components/AdminMatchingPanel';
import UserManagement from './components/UserManagement';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    user_type?: string;
    name?: string;
  };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'matching' | 'management'>('dashboard');

  useEffect(() => {
    // 認証状態の監視
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user as User);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    // 初期ユーザー状態の取得
    const getInitialUser = async () => {
      try {
        const { data } = await auth.getCurrentUser();
        if (data?.user) {
          setUser(data.user as User);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
    return <LoginForm onLoginSuccess={(user) => setUser(user)} />;
  }

  const userType = user.user_metadata?.user_type || 'pharmacist';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                薬局シフト管理システム
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.user_metadata?.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
          
          {/* ナビゲーション */}
          <nav className="flex space-x-8 pb-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ダッシュボード
            </button>
            
            {userType === 'admin' && (
              <>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  管理パネル
                </button>
                <button
                  onClick={() => setCurrentView('matching')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'matching'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  マッチング
                </button>
                <button
                  onClick={() => setCurrentView('management')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'management'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ユーザー管理
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'dashboard' && (
          <UserDashboard user={user} userType={userType} />
        )}
        {currentView === 'admin' && userType === 'admin' && (
          <AdminPanel />
        )}
        {currentView === 'matching' && userType === 'admin' && (
          <AdminMatchingPanel />
        )}
        {currentView === 'management' && userType === 'admin' && (
          <UserManagement />
        )}
      </main>
    </div>
  );
}

export default App;