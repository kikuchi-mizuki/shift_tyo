import React, { useState } from 'react';
import { X, Ban, Building2, User, Save } from 'lucide-react';
import { User as UserType, Pharmacy } from '../types';

interface NGSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  users: UserType[];
  pharmacies: Pharmacy[];
  onUpdateNGList: (ngList: string[]) => void;
}

export const NGSettingsModal: React.FC<NGSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  pharmacies,
  onUpdateNGList
}) => {
  const [selectedNGList, setSelectedNGList] = useState<string[]>(currentUser.ngList || []);

  if (!isOpen) return null;

  const handleToggleNG = (id: string) => {
    setSelectedNGList(prev => 
      prev.includes(id) 
        ? prev.filter(ngId => ngId !== id)
        : [...prev, id]
    );
  };

  const handleSave = () => {
    onUpdateNGList(selectedNGList);
    onClose();
    
    // 保存完了メッセージ
    if (selectedNGList.length > 0) {
      alert(`${selectedNGList.length}件のNG設定を保存しました。次回のシフトマッチングから反映されます。`);
    }
  };

  const availableTargets = currentUser.type === 'pharmacist' 
    ? pharmacies.filter(p => p.id !== currentUser.pharmacyId)
    : users.filter(u => u.type === 'pharmacist' && u.id !== currentUser.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-50">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">NG設定</h2>
              <p className="text-sm text-gray-600">
                {currentUser.type === 'pharmacist' ? 'NG薬局を設定' : 'NG薬剤師を設定'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              {currentUser.type === 'pharmacist' 
                ? 'シフトマッチングで除外したい薬局を選択してください。'
                : 'シフトマッチングで除外したい薬剤師を選択してください。'
              }
            </p>
          </div>

          <div className="space-y-3">
            {availableTargets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                設定可能な{currentUser.type === 'pharmacist' ? '薬局' : '薬剤師'}がありません
              </div>
            ) : (
              availableTargets.map((target) => (
                <div
                  key={target.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedNGList.includes(target.id)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleNG(target.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {currentUser.type === 'pharmacist' ? (
                        <Building2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{target.name}</div>
                      {currentUser.type === 'pharmacist' ? (
                        <div className="text-sm text-gray-600">
                          {(target as Pharmacy).address}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {target.email}
                          {target.specialties && target.specialties.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              専門: {target.specialties.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {selectedNGList.includes(target.id) && (
                      <div className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                        NG設定済み
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedNGList.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>注意:</strong> NG設定した{currentUser.type === 'pharmacist' ? '薬局' : '薬剤師'}とは
                シフトマッチングが行われません。設定は後から変更できます。
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedNGList.length}件のNG設定
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};