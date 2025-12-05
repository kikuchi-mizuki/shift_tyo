/**
 * PharmacistRequests.tsx
 * 薬剤師希望リスト表示・追加コンポーネント
 */

import React from 'react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacistRequestsProps {
  requests: any[];
  userProfiles: any;
  showAddForm: boolean;
  newRequest: any;
  onToggleAddForm: () => void;
  onRequestChange: (request: any) => void;
  onAdd: () => void;
  onDelete: (requestId: string) => void;
}

export const PharmacistRequests: React.FC<PharmacistRequestsProps> = ({
  requests,
  userProfiles,
  showAddForm,
  newRequest,
  onToggleAddForm,
  onRequestChange,
  onAdd,
  onDelete
}) => {
  const getTimeDisplay = (request: any) => {
    const s = (request.start_time || '').toString();
    const e = (request.end_time || '').toString();
    if (s && e) return `${s.slice(0, 5)}-${e.slice(0, 5)}`;
    if (request.time_slot === 'morning') return '09:00-13:00';
    if (request.time_slot === 'afternoon') return '13:00-18:00';
    if (request.time_slot === 'full' || request.time_slot === 'fullday') return '09:00-18:00';
    return '要相談';
  };

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        <h4 className="text-sm font-semibold text-blue-800">
          応募している薬剤師 ({safeLength(requests)}件)
        </h4>
      </div>

      {/* 追加ボタン */}
      <div className="mb-3">
        <button
          onClick={onToggleAddForm}
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
        >
          {showAddForm ? 'フォームを閉じる' : '希望を追加'}
        </button>
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div className="mb-3 bg-white border rounded p-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="text-xs border rounded px-2 py-1"
              value={newRequest.pharmacist_id}
              onChange={(e) => onRequestChange({ ...newRequest, pharmacist_id: e.target.value })}
            >
              <option value="">薬剤師を選択</option>
              {Object.entries(userProfiles || {})
                .filter(([_, profile]: [string, any]) => profile && profile.user_type === 'pharmacist')
                .map(([id, profile]: [string, any]) => (
                  <option key={id} value={id}>{profile.name || profile.email}</option>
                ))}
            </select>
            <input
              className="text-xs border rounded px-2 py-1"
              type="time"
              value={newRequest.start_time}
              onChange={(e) => onRequestChange({ ...newRequest, start_time: e.target.value })}
              placeholder="開始時間"
            />
            <input
              className="text-xs border rounded px-2 py-1"
              type="time"
              value={newRequest.end_time}
              onChange={(e) => onRequestChange({ ...newRequest, end_time: e.target.value })}
              placeholder="終了時間"
            />
            <select
              className="text-xs border rounded px-2 py-1"
              value={newRequest.priority}
              onChange={(e) => onRequestChange({ ...newRequest, priority: e.target.value })}
            >
              <option value="low">優先度: 低</option>
              <option value="medium">優先度: 中</option>
              <option value="high">優先度: 高</option>
            </select>
          </div>
          <div className="mt-2">
            <button onClick={onAdd} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              追加
            </button>
          </div>
        </div>
      )}

      {/* 希望リスト */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {requests.map((request: any, index: number) => {
          const pharmacistProfile = userProfiles[request.pharmacist_id];
          return (
            <div key={index} className="bg-white rounded border px-2 py-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="text-xs text-gray-800 leading-snug break-words">
                    {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {getTimeDisplay(request)}
                  </div>
                  <div className="mt-1 space-x-1">
                    <button onClick={() => onDelete(request.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">
                      削除
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
