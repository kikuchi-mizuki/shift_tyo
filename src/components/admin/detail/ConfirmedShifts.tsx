/**
 * ConfirmedShifts.tsx
 * 確定シフト一覧表示コンポーネント
 */

import React from 'react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface ConfirmedShiftsProps {
  shifts: any[];
  userProfiles: any;
  onCancel: (shiftId: string) => void;
}

export const ConfirmedShifts: React.FC<ConfirmedShiftsProps> = ({
  shifts,
  userProfiles,
  onCancel
}) => {
  if (safeLength(shifts) === 0) {
    return null;
  }

  const getStoreName = (shift: any) => {
    const direct = (shift.store_name || '').trim();
    let fromMemo = '';
    if (!direct && typeof shift.memo === 'string') {
      const m = shift.memo.match(/\[store:([^\]]+)\]/);
      if (m && m[1]) fromMemo = m[1];
    }
    return direct || fromMemo || '（店舗名未設定）';
  };

  return (
    <div className="bg-green-50 rounded-lg border border-green-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-green-800">
            確定シフト ({safeLength(shifts)}件)
          </h4>
        </div>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {shifts.map((shift: any, index: number) => {
          const pharmacistName = shift.pharmacist?.name || userProfiles[shift.pharmacist_id]?.name || '薬剤師名未設定';
          const pharmacyName = shift.pharmacy?.name || userProfiles[shift.pharmacy_id]?.name || '薬局名未設定';
          const storeName = getStoreName(shift);

          return (
            <div key={index} className="bg-white rounded border px-2 py-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="text-xs text-gray-800 leading-snug break-words">
                    <div>薬剤師: {pharmacistName}</div>
                    <div>薬局: {pharmacyName}</div>
                    <div>店舗: {storeName}</div>
                  </div>
                </div>
                <button
                  onClick={() => onCancel(shift.id)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  取消
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
