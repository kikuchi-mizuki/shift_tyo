import React, { useState } from 'react';
import { User, Building2, LogOut, Shield, Pill, Ban } from 'lucide-react';
import { User as UserType } from '../types';

interface UserDashboardProps {
  currentUser: UserType;
  onUserSwitch: (userId: string) => void;
  availableUsers: UserType[];
  onSignOut?: () => void;
  onOpenNGSettings?: (() => void) | undefined;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onUserSwitch,
  availableUsers,
  onSignOut,
  onOpenNGSettings
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'pharmacy': return Building2;
      case 'pharmacist': return Pill;
      case 'admin': return Shield;
      default: return User;
    }
  };

  const getUserTypeBadge = (type: string) => {
    const configs = {
      pharmacy: { label: '薬局', color: 'bg-blue-100 text-blue-800' },
      store: { label: '薬局', color: 'bg-blue-100 text-blue-800' },
      pharmacist: { label: '薬剤師', color: 'bg-green-100 text-green-800' },
      admin: { label: '管理者', color: 'bg-purple-100 text-purple-800' }
    };
    const config = configs[type as keyof typeof configs] || { label: 'ユーザー', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Pill className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">シフト調整システム</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {(currentUser.type === 'pharmacist' || currentUser.type === 'store') && (
            <button 
              onClick={onOpenNGSettings}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="NG設定"
            >
              <Ban className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
              <div className="text-xs text-gray-500">{currentUser.email}</div>
            </div>
            {getUserTypeBadge(currentUser.type)}
            <button 
              onClick={onSignOut}
              className="flex items-center space-x-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          
          {/* デモ用のユーザー切り替えは削除 */}
          {/*<div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {React.createElement(getUserTypeIcon(currentUser.type), {
                  className: "w-5 h-5 text-gray-600"
                })}
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-xs text-gray-500">
                    {currentUser.licenseNumber && `免許番号: ${currentUser.licenseNumber}`}
                    {currentUser.type === 'pharmacy' && currentUser.email}
                    {currentUser.type === 'admin' && currentUser.email}
                  </div>
                </div>
              </div>
              {getUserTypeBadge(currentUser.type)}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">アカウント切り替え</div>
                  <div className="text-xs text-gray-500">デモ用：異なる役割でシステムを体験</div>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  {availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onUserSwitch(user.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        currentUser.id === user.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {React.createElement(getUserTypeIcon(user.type), {
                          className: `w-4 h-4 ${
                            user.type === 'pharmacy' ? 'text-blue-600' : 
                            user.type === 'pharmacist' ? 'text-green-600' : 'text-purple-600'
                          }`
                        })}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">
                            {user.licenseNumber && `免許: ${user.licenseNumber}`}
                            {user.experience && ` | 経験: ${user.experience}年`}
                          </div>
                          {user.specialties && user.specialties.length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              専門: {user.specialties.join(', ')}
                            </div>
                          )}
                          {user.ngList && user.ngList.length > 0 && (
                            <div className="text-xs text-red-400 mt-1">
                              NG設定: {user.ngList.length}件
                            </div>
                          )}
                        </div>
                      </div>
                      {getUserTypeBadge(user.type)}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-100">
                  <button 
                    onClick={onSignOut}
                    className="w-full flex items-center space-x-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">ログアウト</span>
                  </button>
                </div>
              </div>
            )}
          </div>*/}
        </div>
      </div>
    </div>
  );
};