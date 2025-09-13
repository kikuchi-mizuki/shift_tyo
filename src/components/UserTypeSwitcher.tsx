import React from 'react';
import { User, Building, Shield, LogOut, ChevronDown } from 'lucide-react';
import { useMultiUserAuth } from '../contexts/MultiUserAuthContext';

export const UserTypeSwitcher: React.FC = () => {
  const { 
    activeSessions, 
    currentUserType, 
    switchUserType, 
    removeSession, 
    getCurrentUser 
  } = useMultiUserAuth();

  const [isOpen, setIsOpen] = React.useState(false);

  const getUserTypeLabel = (type: 'pharmacist' | 'pharmacy' | 'admin') => {
    switch (type) {
      case 'pharmacist': return '薬剤師';
      case 'pharmacy': return '薬局';
      case 'admin': return '管理者';
    }
  };

  const getUserTypeIcon = (type: 'pharmacist' | 'pharmacy' | 'admin') => {
    switch (type) {
      case 'pharmacist': return <User className="w-4 h-4" />;
      case 'pharmacy': return <Building className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
    }
  };

  const currentUser = getCurrentUser();

  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {currentUser && getUserTypeIcon(currentUser.user_type)}
        <span className="text-sm text-gray-700">
          {currentUser ? getUserTypeLabel(currentUser.user_type) : 'ユーザー選択'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2 px-2">アクティブセッション</div>
            <div className="space-y-1">
              {activeSessions.map((session) => (
                <div
                  key={session.user_type}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    currentUserType === session.user_type
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      switchUserType(session.user_type);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-3 flex-1 text-left"
                  >
                    {getUserTypeIcon(session.user_type)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getUserTypeLabel(session.user_type)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {session.name}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      removeSession(session.user_type);
                      setIsOpen(false);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="ログアウト"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {activeSessions.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                <p className="text-sm">アクティブセッションがありません</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
