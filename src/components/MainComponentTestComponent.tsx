import React, { useState } from 'react';
import AdminDashboardRefactored from './AdminDashboardRefactored';

const MainComponentTestComponent: React.FC = () => {
  const [showRefactored, setShowRefactored] = useState(false);
  const [testUser] = useState({
    id: 'test-admin',
    email: 'admin@test.com',
    name: 'テスト管理者',
    user_type: 'admin'
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">新しいメインコンポーネント動作確認</h2>
      
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">注意事項</h3>
        <p className="text-sm text-yellow-700">
          このテストでは、新しいAdminDashboardRefactoredコンポーネントの動作を確認します。
          元のAdminDashboardと比較して、機能が正常に動作することを確認してください。
        </p>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setShowRefactored(!showRefactored)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            showRefactored
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {showRefactored ? '新しいコンポーネントを非表示' : '新しいコンポーネントを表示'}
        </button>
      </div>

      {showRefactored && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">AdminDashboardRefactored</h3>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-blue-800 mb-2">確認項目</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✅ ヘッダーが正しく表示される</li>
              <li>✅ タブナビゲーションが動作する</li>
              <li>✅ カレンダータブが正常に表示される</li>
              <li>✅ マッチングタブが正常に表示される</li>
              <li>✅ ユーザー管理タブが正常に表示される</li>
              <li>✅ 統計タブが正常に表示される</li>
              <li>✅ 緊急シフトボタンが動作する</li>
              <li>✅ システムステータスが表示される</li>
            </ul>
          </div>
          
          <AdminDashboardRefactored user={testUser} />
        </div>
      )}

      {!showRefactored && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600">「新しいコンポーネントを表示」ボタンをクリックしてテストを開始してください</p>
        </div>
      )}
    </div>
  );
};

export default MainComponentTestComponent;
