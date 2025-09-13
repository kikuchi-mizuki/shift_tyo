import React, { useState } from 'react';
import { Users, User, Building, Shield, Clock, CheckCircle } from 'lucide-react';

interface MultiUserGuideProps {
  userType: 'pharmacist' | 'pharmacy' | 'admin';
}

export const MultiUserGuide: React.FC<MultiUserGuideProps> = ({ userType }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const getUserTypeInfo = () => {
    switch (userType) {
      case 'pharmacist':
        return {
          icon: <User className="w-6 h-6 text-blue-600" />,
          title: '薬剤師としてログイン中',
          description: 'シフト希望の登録・確認ができます',
          features: [
            'シフト希望の登録・更新・削除',
            '確定シフトの確認',
            'NG薬局の設定（薬局全体・店舗毎）',
            'プロフィール管理'
          ]
        };
      case 'pharmacy':
        return {
          icon: <Building className="w-6 h-6 text-green-600" />,
          title: '薬局としてログイン中',
          description: '薬剤師の募集・管理ができます',
          features: [
            '薬剤師募集の登録・管理',
            '確定シフトの確認',
            'NG薬剤師の設定（薬局全体・店舗毎）',
            '店舗名・プロフィール管理'
          ]
        };
      case 'admin':
        return {
          icon: <Shield className="w-6 h-6 text-purple-600" />,
          title: '管理者としてログイン中',
          description: 'システム全体の管理ができます',
          features: [
            'シフトの一括確定・取り消し',
            'ユーザー管理',
            'マッチング管理',
            'システム状態の管理'
          ]
        };
    }
  };

  const info = getUserTypeInfo();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {info.icon}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">
              {info.title}
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              {info.description}
            </p>
            <div className="space-y-1">
              {info.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-400 hover:text-blue-600 p-1"
        >
          ×
        </button>
      </div>
      
      <div className="mt-4 pt-3 border-t border-blue-200">
        <div className="flex items-center space-x-2 text-xs text-blue-600">
          <Users className="w-3 h-3" />
          <span>他のユーザー（薬剤師・薬局・管理者）も同時にシステムを利用できます</span>
        </div>
      </div>
    </div>
  );
};
