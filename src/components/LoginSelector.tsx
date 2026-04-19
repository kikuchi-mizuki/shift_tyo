import React from 'react';
import { User, Building, Pill, Shield } from 'lucide-react';

export const LoginSelector: React.FC = () => {
  const loginOptions = [
    {
      type: 'pharmacist',
      title: '薬剤師',
      description: 'シフト希望の登録・確認',
      icon: User,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      url: '/pharmacist-login'
    },
    {
      type: 'pharmacy',
      title: '薬局',
      description: '募集の作成・薬剤師の確保',
      icon: Building,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      url: '/pharmacy-login'
    },
    {
      type: 'admin',
      title: '管理者',
      description: 'システム管理・マッチング',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      url: '/admin-login'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              AIシフトマネージャー
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            ログインするユーザータイプを選択してください
          </p>
        </div>

        {/* ログイン選択カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loginOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => window.location.href = option.url}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 p-6"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className={`w-20 h-20 bg-gradient-to-br ${option.color} ${option.hoverColor} rounded-xl flex items-center justify-center shadow-lg transition-all duration-300`}>
                  <option.icon className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {option.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
                <div className="mt-4 px-6 py-2 bg-gray-50 group-hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                  <span className="text-sm font-medium">ログイン画面へ →</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* フッター */}
        <div className="text-center text-sm text-gray-500">
          <p>初めてご利用の方は、各ログイン画面から新規登録できます</p>
        </div>
      </div>
    </div>
  );
};
