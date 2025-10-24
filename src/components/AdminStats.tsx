import React from 'react';
import { BarChart3, Users, Building, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface AdminStatsProps {
  assigned: any[];
  requests: any[];
  postings: any[];
  userProfiles: any;
  systemStatus: string;
  lastUpdated: Date;
  recruitmentStatus: {
    is_open: boolean;
    updated_at: string;
    updated_by: string | null;
    notes: string | null;
  };
}

const AdminStats: React.FC<AdminStatsProps> = ({
  assigned,
  requests,
  postings,
  userProfiles,
  systemStatus,
  lastUpdated,
  recruitmentStatus
}) => {
  const pharmacists = Object.values(userProfiles).filter((profile: any) => profile.user_type === 'pharmacist');
  const pharmacies = Object.values(userProfiles).filter((profile: any) => profile.user_type === 'pharmacy');

  const stats = [
    {
      title: '確定シフト',
      value: assigned.length,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'シフトリクエスト',
      value: requests.length,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'シフトポスティング',
      value: postings.length,
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '登録薬剤師',
      value: pharmacists.length,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: '登録薬局',
      value: pharmacies.length,
      icon: Building,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* システムステータス */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
            システム状況
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            systemStatus === 'active' 
              ? 'bg-green-100 text-green-800' 
              : systemStatus === 'error' 
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {systemStatus === 'active' ? '正常' : systemStatus === 'error' ? 'エラー' : '処理中'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">最終更新</div>
            <div className="font-medium">{lastUpdated.toLocaleString()}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">募集状況</div>
            <div className={`font-medium ${recruitmentStatus.is_open ? 'text-green-600' : 'text-red-600'}`}>
              {recruitmentStatus.is_open ? '募集中' : '停止中'}
            </div>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">{stat.title}</div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 詳細統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">詳細統計</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">シフト状況</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">今月の確定シフト</span>
                <span className="font-medium">{assigned.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">未処理リクエスト</span>
                <span className="font-medium">{requests.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">未処理ポスティング</span>
                <span className="font-medium">{postings.length}件</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">ユーザー状況</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">登録薬剤師</span>
                <span className="font-medium">{pharmacists.length}名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">登録薬局</span>
                <span className="font-medium">{pharmacies.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">総ユーザー数</span>
                <span className="font-medium">{pharmacists.length + pharmacies.length}名</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
