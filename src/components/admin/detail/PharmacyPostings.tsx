/**
 * PharmacyPostings.tsx
 * 薬局募集リスト表示・追加コンポーネント
 */

import React from 'react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacyPostingsProps {
  postings: any[];
  userProfiles: any;
  showAddForm: boolean;
  newPosting: any;
  onToggleAddForm: () => void;
  onPostingChange: (posting: any) => void;
  onAdd: () => void;
  onDelete: (postingId: string) => void;
}

export const PharmacyPostings: React.FC<PharmacyPostingsProps> = ({
  postings,
  userProfiles,
  showAddForm,
  newPosting,
  onToggleAddForm,
  onPostingChange,
  onAdd,
  onDelete
}) => {
  const getStoreName = (posting: any) => {
    const direct = (posting.store_name || '').trim();
    let fromMemo = '';
    if (!direct && typeof posting.memo === 'string') {
      const m = posting.memo.match(/\[store:([^\]]+)\]/);
      if (m && m[1]) fromMemo = m[1];
    }
    return direct || fromMemo || '（店舗名未設定）';
  };

  const getTimeDisplay = (posting: any) => {
    const s = (posting.start_time || '').toString();
    const e = (posting.end_time || '').toString();
    if (s && e) return `${s.slice(0, 5)}-${e.slice(0, 5)}`;
    if (posting.time_slot === 'morning') return '09:00-13:00';
    if (posting.time_slot === 'afternoon') return '13:00-18:00';
    if (posting.time_slot === 'full' || posting.time_slot === 'fullday') return '09:00-18:00';
    return '要相談';
  };

  return (
    <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        <h4 className="text-sm font-semibold text-orange-800">
          募集している薬局 ({safeLength(postings)}件)
        </h4>
      </div>

      {/* 追加ボタン */}
      <div className="mb-3">
        <button
          onClick={onToggleAddForm}
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
        >
          {showAddForm ? 'フォームを閉じる' : '募集を追加'}
        </button>
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div className="mb-3 bg-white border rounded p-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="text-xs border rounded px-2 py-1"
              value={newPosting.pharmacy_id}
              onChange={(e) => onPostingChange({ ...newPosting, pharmacy_id: e.target.value, store_name: '' })}
            >
              <option value="">薬局を選択</option>
              {Object.entries(userProfiles || {})
                .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacy' || profile.user_type === 'store')
                .map(([id, profile]: [string, any]) => (
                  <option key={id} value={id}>{profile.name || profile.email}</option>
                ))}
            </select>
            <input
              className="text-xs border rounded px-2 py-1"
              value={newPosting.store_name}
              onChange={(e) => onPostingChange({ ...newPosting, store_name: e.target.value })}
              placeholder="店舗名（任意）"
            />
            <input
              className="text-xs border rounded px-2 py-1"
              type="time"
              value={newPosting.start_time}
              onChange={(e) => onPostingChange({ ...newPosting, start_time: e.target.value })}
              placeholder="開始時間"
            />
            <input
              className="text-xs border rounded px-2 py-1"
              type="time"
              value={newPosting.end_time}
              onChange={(e) => onPostingChange({ ...newPosting, end_time: e.target.value })}
              placeholder="終了時間"
            />
            <input
              className="text-xs border rounded px-2 py-1"
              type="number"
              min={1}
              value={newPosting.required_staff}
              onChange={(e) => onPostingChange({ ...newPosting, required_staff: e.target.value })}
              placeholder="必要人数"
            />
          </div>
          <div className="mt-2">
            <button onClick={onAdd} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded">
              追加
            </button>
          </div>
        </div>
      )}

      {/* 募集リスト */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {postings.map((posting: any, index: number) => {
          const pharmacyProfile = userProfiles[posting.pharmacy_id];
          return (
            <div key={index} className="bg-white rounded border px-2 py-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="text-xs text-gray-800 leading-snug break-words">
                    {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(posting)})
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {getTimeDisplay(posting)}
                  </div>
                  <div className="mt-1 space-x-1">
                    <button onClick={() => onDelete(posting.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">
                      削除
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {posting.required_staff}人
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
