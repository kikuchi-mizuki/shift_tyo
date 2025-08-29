import React, { useState } from 'react';
import { User, Plus, Edit3, Trash2, Eye, EyeOff, Save, X, Shield, Pill, Building2 } from 'lucide-react';
import { User as UserType } from '../types';

interface UserManagementProps {
  users: UserType[];
  onUpdateUsers: (users: UserType[]) => void;
  currentUser: UserType;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onUpdateUsers,
  currentUser
}) => {
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [formData, setFormData] = useState<Partial<UserType & { password: string }>>({});

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
      pharmacist: { label: '薬剤師', color: 'bg-green-100 text-green-800' },
      admin: { label: '管理者', color: 'bg-purple-100 text-purple-800' }
    };
    const config = configs[type as keyof typeof configs] || configs.pharmacist;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      ...user,
      password: '********' // プレースホルダー
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      email: '',
      password: '',
      type: 'pharmacist',
      licenseNumber: '',
      experience: 0,
      specialties: [],
      ngList: []
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || (!isCreating && !editingUser)) return;

    const newUser: UserType = {
      id: editingUser?.id || `user-${Date.now()}`,
      name: formData.name!,
      email: formData.email!,
      type: formData.type as UserType['type'],
      licenseNumber: formData.licenseNumber,
      pharmacyId: formData.pharmacyId,
      experience: formData.experience,
      specialties: formData.specialties || [],
      ngList: formData.ngList || []
    };

    if (isCreating) {
      onUpdateUsers([...users, newUser]);
      setIsCreating(false);
    } else if (editingUser) {
      onUpdateUsers(users.map(u => u.id === editingUser.id ? newUser : u));
      setEditingUser(null);
    }
    
    setFormData({});
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser.id) {
      alert('自分のアカウントは削除できません');
      return;
    }
    if (confirm('このユーザーを削除しますか？')) {
      onUpdateUsers(users.filter(u => u.id !== userId));
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCancel = () => {
    setEditingUser(null);
    setIsCreating(false);
    setFormData({});
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6" />
            <h2 className="text-2xl font-bold">ユーザー管理</h2>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新規ユーザー</span>
          </button>
        </div>
        <p className="text-purple-100 mt-2">システムユーザーのアカウント管理</p>
      </div>

      <div className="p-6">
        {/* 新規作成・編集フォーム */}
        {(isCreating || editingUser) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {isCreating ? '新規ユーザー作成' : 'ユーザー編集'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="名前・企業名を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder={isCreating ? "パスワードを入力" : "変更する場合のみ入力"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー種別</label>
                <select
                  value={formData.type || 'pharmacist'}
                  onChange={(e) => setFormData({...formData, type: e.target.value as UserType['type']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="pharmacist">薬剤師</option>
                  <option value="pharmacy">薬局</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>保存</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
            </div>
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">登録ユーザー一覧 ({users.length}名)</h3>
          
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {React.createElement(getUserTypeIcon(user.type), {
                    className: `w-5 h-5 ${
                      user.type === 'pharmacy' ? 'text-blue-600' : 
                      user.type === 'pharmacist' ? 'text-green-600' : 'text-purple-600'
                    }`
                  })}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">{user.name}</span>
                    {getUserTypeBadge(user.type)}
                    {user.id === currentUser.id && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        現在のユーザー
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePasswordVisibility(user.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="パスワード表示"
                  >
                    {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="text-sm text-gray-500 font-mono">
                    {showPasswords[user.id] ? 'password123' : '********'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEdit(user)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="編集"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={user.id === currentUser.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">ユーザー管理について</div>
            <ul className="space-y-1 text-xs">
              <li>• 新規ユーザーの作成、既存ユーザーの編集・削除が可能です</li>
              <li>• パスワードは暗号化されて保存されます（デモでは簡易表示）</li>
              <li>• 薬剤師は免許番号と経験年数の登録が必要です</li>
              <li>• 自分のアカウントは削除できません</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};