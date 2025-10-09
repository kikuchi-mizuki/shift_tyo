import React from 'react';
import { LineIntegration } from './LineIntegration';
import { Settings } from 'lucide-react';

interface SettingsPageProps {
  userId: string;
  userName: string;
  userType: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userId, userName, userType }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          <p className="text-sm text-gray-600">{userName}さん ({userType === 'pharmacist' ? '薬剤師' : '薬局'})</p>
        </div>
      </div>

      {/* LINE通知設定 */}
      <LineIntegration userId={userId} />

      {/* その他の設定項目をここに追加 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">アカウント情報</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">名前</span>
            <span className="font-medium text-gray-900">{userName}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">種別</span>
            <span className="font-medium text-gray-900">
              {userType === 'pharmacist' ? '薬剤師' : userType === 'pharmacy' ? '薬局' : '管理者'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

