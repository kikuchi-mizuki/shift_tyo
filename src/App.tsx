import React, { useState, useEffect, Component, ReactNode } from 'react';
import { supabase, auth } from './lib/supabase';
import LoginForm from './components/LoginForm';
// 遅延読み込みで循環依存や初期化順の問題を回避
const PharmacistDashboard = React.lazy(() => 
  import('./components/PharmacistDashboard').catch(error => {
    console.error('Failed to load PharmacistDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">PharmacistDashboardの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
const PharmacyDashboard = React.lazy(() => 
  import('./components/PharmacyDashboard').catch(error => {
    console.error('Failed to load PharmacyDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">PharmacyDashboardの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
const AdminDashboard = React.lazy(() => 
  import('./components/AdminDashboard').catch(error => {
    console.error('Failed to load AdminDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">AdminDashboardの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
const AdminPanel = React.lazy(() => 
  import('./components/AdminPanel').catch(error => {
    console.error('Failed to load AdminPanel:', error);
    return { default: () => <div className="p-4 text-red-600">AdminPanelの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
const AdminMatchingPanel = React.lazy(() => 
  import('./components/AdminMatchingPanel').catch(error => {
    console.error('Failed to load AdminMatchingPanel:', error);
    return { default: () => <div className="p-4 text-red-600">AdminMatchingPanelの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
const UserManagement = React.lazy(() => 
  import('./components/UserManagement').catch(error => {
    console.error('Failed to load UserManagement:', error);
    return { default: () => <div className="p-4 text-red-600">UserManagementの読み込みに失敗しました。ページを再読み込みしてください。</div> };
  })
);
import { useAuth } from './hooks/useAuth';
import { MultiUserIndicator } from './components/MultiUserIndicator';
import { MultiUserAuthProvider, useMultiUserAuth } from './contexts/MultiUserAuthContext';
import { MultiUserLoginForm } from './components/MultiUserLoginForm';
import { UserTypeSwitcher } from './components/UserTypeSwitcher';

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

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

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
          <details className="text-sm text-red-700 mb-4">
            <summary className="cursor-pointer">▼エラー詳細</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error?.toString()}
            </pre>
            {this.state.error && (
              <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto">
                {this.state.error.stack}
              </pre>
            )}
          </details>
          <div className="space-x-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              再試行
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { currentUserType, getCurrentUser, activeSessions } = useMultiUserAuth();
  const { user, userProfile, loading, signOut } = useAuth();
  
  console.log('App: Multi-user auth state:', {
    currentUserType,
    activeSessions: activeSessions.length,
    hasUser: !!user
  });
  
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

  // アクティブセッションがない場合はマルチユーザーログイン画面を表示
  if (activeSessions.length === 0) {
    return <MultiUserLoginForm onLoginSuccess={() => {}} />;
  }

  // 現在のユーザータイプが設定されていない場合は最初のセッションを使用
  const effectiveUserType = currentUserType || activeSessions[0]?.user_type;
  const currentUser = getCurrentUser();

  if (!effectiveUserType || !currentUser) {
    return <MultiUserLoginForm onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* デバッグ情報 */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 m-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">デバッグ情報</h3>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>現在のユーザータイプ: {effectiveUserType}</div>
            <div>アクティブセッション数: {activeSessions.length}</div>
            <div>現在のユーザー: {currentUser?.name}</div>
          </div>
        </div>
      )}
      
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:h-16 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">シ</span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                シフト調整システム
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <MultiUserIndicator currentUser={currentUser} />
              <UserTypeSwitcher />
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-32 sm:max-w-none">
                {currentUser?.email}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {effectiveUserType === 'pharmacist' ? '薬剤師' : effectiveUserType === 'pharmacy' ? '薬局' : effectiveUserType === 'admin' ? '管理' : 'ユーザー'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <ErrorBoundary>
          <React.Suspense fallback={<div className="p-6 text-gray-600">読み込み中...</div>}>
            {effectiveUserType === 'pharmacist' && (
              <PharmacistDashboard user={currentUser} />
            )}
            {effectiveUserType === 'pharmacy' && (
              <PharmacyDashboard user={currentUser} />
            )}
            {effectiveUserType === 'admin' && (
              <AdminDashboard user={currentUser} />
            )}
          </React.Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <MultiUserAuthProvider>
      <AppContent />
    </MultiUserAuthProvider>
  );
}

export default App;