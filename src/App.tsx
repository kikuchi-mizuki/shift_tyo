import React, { useEffect, Component, ReactNode } from 'react';
import { auth } from './lib/supabase';
import { Pill } from 'lucide-react';
import { safeSetLocalStorageJSON, safeGetLocalStorage, safeRemoveLocalStorage } from './utils/storage';
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
// TODO: enable when route added
// const AdminPanel = React.lazy(() => 
//   import('./components/AdminPanel').catch(error => {
//     console.error('Failed to load AdminPanel:', error);
//     return { default: () => <div className="p-4 text-red-600">AdminPanelの読み込みに失敗しました。ページを再読み込みしてください。</div> };
//   })
// );
// const AdminMatchingPanel = React.lazy(() => 
//   import('./components/AdminMatchingPanel').catch(error => {
//     console.error('Failed to load AdminMatchingPanel:', error);
//     return { default: () => <div className="p-4 text-red-600">AdminMatchingPanelの読み込みに失敗しました。ページを再読み込みしてください。</div> };
//   })
// );
// const UserManagement = React.lazy(() => 
//   import('./components/UserManagement').catch(error => {
//     console.error('Failed to load UserManagement:', error);
//     return { default: () => <div className="p-4 text-red-600">UserManagementの読み込みに失敗しました。ページを再読み込みしてください。</div> };
//   })
// );
// const SettingsPage = React.lazy(() => 
//   import('./components/SettingsPage').catch(error => {
//     console.error('Failed to load SettingsPage:', error);
//     return { default: () => <div className="p-4 text-red-600">SettingsPageの読み込みに失敗しました。ページを再読み込みしてください。</div> };
//   })
// );
import { MultiUserIndicator } from './components/MultiUserIndicator';
import { MultiUserAuthProvider, useMultiUserAuth } from './contexts/MultiUserAuthContext';
import { MultiUserLoginForm } from './components/MultiUserLoginForm';
import { AdminLoginForm } from './components/AdminLoginForm';
import { UserTypeSwitcher } from './components/UserTypeSwitcher';
import { PasswordResetRequest } from './components/PasswordResetRequest';
import { PasswordResetComplete } from './components/PasswordResetComplete';
import PasswordChangeModal from './components/PasswordChangeModal';

// エラーバウンダリーコンポーネント
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error; retryKey: number }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
      if (safeSetLocalStorageJSON('last_error_report', errorReport)) {
        console.log('Error report saved:', errorReport);
      }
    } catch (e) {
      console.error('Failed to save error report:', e);
    }
  }

  handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      error: undefined,
      retryKey: s.retryKey + 1,
    }));
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

    // retryKey が変わると子が再マウントされる
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

function AppContent() {
  const { currentUserType, getCurrentUser, activeSessions } = useMultiUserAuth();
  const [showPasswordReset, setShowPasswordReset] = React.useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = React.useState(false);

  // URLパスから画面を判定（SSRガード付き）
  const currentPath = typeof window !== 'undefined' ? window.location?.pathname : '/';
  const isAdminLoginPath = currentPath === '/admin-login' || currentPath?.startsWith('/admin-login/');
  const isPasswordResetPath = currentPath === '/password-reset' || currentPath?.startsWith('/password-reset/');
  const isResetPasswordPath = currentPath === '/reset-password' || currentPath?.startsWith('/reset-password/');

  // アプリケーション起動時の診断
  useEffect(() => {
    // 前回のエラーレポートを確認
    try {
      const lastError = safeGetLocalStorage('last_error_report');
      if (lastError) {
        // エラーレポートをクリア
        safeRemoveLocalStorage('last_error_report');
      }
    } catch (e) {
      console.error('Failed to check error report:', e);
    }
  }, [currentPath, currentUserType, activeSessions.length]);

  // パスワードリセット完了画面（メールからのリンクでアクセス）
  if (isResetPasswordPath) {
    return <PasswordResetComplete />;
  }

  // パスワードリセット申請画面（管理者・一般共通）
  if (isPasswordResetPath || showPasswordReset) {
    const userType = isAdminLoginPath ? 'admin' : 'general';
    return (
      <PasswordResetRequest
        onBack={() => {
          setShowPasswordReset(false);
          if (isPasswordResetPath) {
            window.history.back();
          }
        }}
        userType={userType}
      />
    );
  }

  // 管理者ログインパスの場合は専用ログイン画面を表示
  if (isAdminLoginPath) {
    return (
      <AdminLoginForm
        onLoginSuccess={() => window.location.href = '/'}
        onPasswordReset={() => setShowPasswordReset(true)}
      />
    );
  }

  // アクティブセッションがない場合はマルチユーザーログイン画面を表示
  if (activeSessions.length === 0) {
    return (
      <MultiUserLoginForm
        onLoginSuccess={() => {}}
        onPasswordReset={() => setShowPasswordReset(true)}
      />
    );
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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:h-16 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <Pill className="w-4 h-4 text-white" />
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
              {effectiveUserType === 'admin' && (
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="text-xs sm:text-sm text-gray-600 hover:text-purple-600 px-2 py-1"
                >
                  パスワード変更
                </button>
              )}
              <button
                onClick={async () => {
                  try {
                    await auth.signOut();
                    // 管理者の場合は管理者ログイン画面に、一般ユーザーの場合は一般ログイン画面にリダイレクト
                    if (effectiveUserType === 'admin') {
                      window.location.href = '/admin-login';
                    } else {
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Logout error:', error);
                    // エラーが発生した場合はページをリロード
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
      <main className="max-w-[1600px] mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <AppErrorBoundary>
          <React.Suspense fallback={
            <div className="p-6">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-5/6 bg-gray-200 rounded animate-pulse" />
            </div>
          }>
            {(() => {
              try {
                if (effectiveUserType === 'pharmacist') {
                  return <PharmacistDashboard user={currentSession} />;
                }
                if (effectiveUserType === 'pharmacy') {
                  return <PharmacyDashboard user={currentSession} />;
                }
                if (effectiveUserType === 'admin') {
                  return (
                    <AppErrorBoundary>
                      <AdminDashboard user={currentSession} />
                    </AppErrorBoundary>
                  );
                }
                console.warn('App: Unknown user type:', effectiveUserType);
                return <div className="p-4 text-red-600">不明なユーザータイプです: {effectiveUserType}</div>;
              } catch (error) {
                console.error('App: Error rendering dashboard:', error);
                return <div className="p-4 text-red-600">ダッシュボードの読み込みに失敗しました。ページを再読み込みしてください。</div>;
              }
            })()}
          </React.Suspense>
        </AppErrorBoundary>
      </main>

      {/* パスワード変更モーダル */}
      {showPasswordChangeModal && currentSession && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          user={currentSession}
          onClose={() => setShowPasswordChangeModal(false)}
        />
      )}
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