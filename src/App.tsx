import React, { useState, useEffect, Component, ReactNode } from 'react';
import { supabase, auth } from './lib/supabase';
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
    
    // エラーを自動的に報告
    try {
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        errorInfo: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      localStorage.setItem('last_error_report', JSON.stringify(errorReport));
      console.log('Error report saved:', errorReport);
    } catch (e) {
      console.error('Failed to save error report:', e);
    }
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
  
  // アプリケーション起動時の診断
  useEffect(() => {
    console.log('=== APP STARTUP DIAGNOSTICS ===');
    console.log('App: Multi-user auth state:', {
      currentUserType,
      activeSessions: activeSessions.length
    });
    
    console.log('App: Environment check:', {
      isProduction: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 20) + '...',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
    });

    // 前回のエラーレポートを確認
    try {
      const lastError = localStorage.getItem('last_error_report');
      if (lastError) {
        const errorReport = JSON.parse(lastError);
        console.log('Previous error report found:', errorReport);
        // エラーレポートをクリア
        localStorage.removeItem('last_error_report');
      }
    } catch (e) {
      console.error('Failed to check error report:', e);
    }

    // ブラウザ機能の確認
    console.log('Browser capabilities:', {
      localStorage: typeof(Storage) !== "undefined",
      sessionStorage: typeof(Storage) !== "undefined",
      fetch: typeof(fetch) !== "undefined",
      Promise: typeof(Promise) !== "undefined",
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    });
  }, []);
  

  // アクティブセッションがない場合はマルチユーザーログイン画面を表示
  if (activeSessions.length === 0) {
    return <MultiUserLoginForm onLoginSuccess={() => {}} />;
  }

  // 現在のユーザータイプが設定されていない場合は最初のセッションを使用
  const effectiveUserType = currentUserType || activeSessions[0]?.user_type;
  // currentUserType が未設定でも画面遷移できるように、effectiveUserType でユーザーを解決
  const currentSession = effectiveUserType
    ? (activeSessions.find(s => s.user_type === effectiveUserType) || activeSessions[0] || null)
    : null;

  if (!effectiveUserType || !currentSession) {
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
            <div>現在のユーザー: {getCurrentUser()?.name}</div>
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
                AIシフトマネージャー
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <MultiUserIndicator currentUser={currentSession} />
              {activeSessions.length > 1 && <UserTypeSwitcher />}
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-32 sm:max-w-none">
                {currentSession?.email}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {effectiveUserType === 'pharmacist' ? '薬剤師' : effectiveUserType === 'pharmacy' ? '薬局' : effectiveUserType === 'admin' ? '管理' : 'ユーザー'}
              </span>
              <button
                onClick={async () => {
                  try {
                    await auth.signOut();
                  } finally {
                    window.location.reload();
                  }
                }}
                className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <ErrorBoundary>
          <React.Suspense fallback={<div className="p-6 text-gray-600">読み込み中...</div>}>
            {effectiveUserType === 'pharmacist' && (
              <PharmacistDashboard user={currentSession} />
            )}
            {effectiveUserType === 'pharmacy' && (
              <PharmacyDashboard user={currentSession} />
            )}
            {effectiveUserType === 'admin' && (
              <AdminDashboard user={currentSession} />
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