import React, { useState, useEffect } from 'react';
import { Users, User, Building, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MultiUserIndicatorProps {
  currentUser: any;
}

export const MultiUserIndicator: React.FC<MultiUserIndicatorProps> = ({ currentUser }) => {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // アクティブユーザーを取得（簡易版 - 実際の実装ではWebSocketやリアルタイム更新が必要）
    const fetchActiveUsers = async () => {
      try {
        // 最近ログインしたユーザーを取得（5分以内）
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: recentLogins } = await supabase
          .from('user_profiles')
          .select('id, name, email, user_type, updated_at')
          .gte('updated_at', fiveMinutesAgo)
          .order('updated_at', { ascending: false });

        if (recentLogins) {
          setActiveUsers(recentLogins);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    fetchActiveUsers();
    
    // 30秒ごとに更新
    const interval = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'pharmacist':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'pharmacy':
        return <Building className="w-4 h-4 text-green-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'pharmacist':
        return '薬剤師';
      case 'pharmacy':
        return '薬局';
      case 'admin':
        return '管理者';
      default:
        return 'ユーザー';
    }
  };

  const currentUserType = currentUser?.user_type || currentUser?.user_metadata?.user_type || 'pharmacist';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Users className="w-4 h-4 text-gray-600" />
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-3">オンラインユーザー</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeUsers.length > 0 ? (
                activeUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg ${
                      user.id === currentUser?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    {getUserTypeIcon(user.user_type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.name || user.email}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-blue-600 font-normal">(あなた)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getUserTypeLabel(user.user_type)}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">オンラインユーザーがいません</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>あなたのタイプ: {getUserTypeLabel(currentUserType)}</span>
                <span>更新: 30秒ごと</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
