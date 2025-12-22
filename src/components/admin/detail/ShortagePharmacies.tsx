/**
 * ShortagePharmacies.tsx
 * 不足薬局リストと手動薬剤師選択コンポーネント
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { safeLength, safeObject } from '../../../utils/admin/arrayHelpers';

interface ShortagePharmaciesProps {
  shortages: any[];
  availablePharmacists: any[];
  manualMatches: { [pharmacyId: string]: string[] };
  onPharmacistSelect: (pharmacyId: string, index: number, pharmacistId: string) => void;
  onSaveManualMatches: () => void;
}

export const ShortagePharmacies: React.FC<ShortagePharmaciesProps> = ({
  shortages,
  availablePharmacists,
  manualMatches,
  onPharmacistSelect,
  onSaveManualMatches
}) => {
  if (safeLength(shortages) === 0) {
    return null;
  }

  const hasManualSelections = Object.values(manualMatches).some(
    matches => matches.some(id => id && id !== '')
  );

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
      <div className="flex items-center space-x-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <h4 className="text-sm font-semibold text-red-800">
          不足薬局 {safeLength(shortages)}薬局
        </h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {(shortages || [])
          .filter((p: any) => p && p.id)
          .map((pharmacy, index) => (
            <div key={index} className="bg-white rounded border p-3 text-sm">
            <div className="font-semibold text-gray-800 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">薬局:</span>
                <span>{pharmacy.name}</span>
              </div>
              {pharmacy.store_name && pharmacy.store_name !== '店舗名なし' && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-green-600">店舗:</span>
                  <span className="text-gray-600">{pharmacy.store_name}</span>
                </div>
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-gray-600">
                不足人数: <span className="text-red-600 font-semibold">{pharmacy.shortage}人</span>
              </div>
              <div className="text-gray-600">
                時間: {pharmacy.start_time || '09:00'}-{pharmacy.end_time || '18:00'}
              </div>
            </div>

            {/* 手動マッチング用プルダウン - 非表示 */}
            {false && pharmacy.shortage > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">
                  <span className="text-red-600">※ 選択した薬剤師の新しいシフト希望が作成されます</span>
                </div>
                <div className="space-y-1">
                  {Array.from({ length: pharmacy.shortage }, (_, slotIndex) => (
                    <div key={slotIndex} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-8">
                        {slotIndex + 1}:
                      </span>
                      <select
                        value={manualMatches[pharmacy.id]?.[slotIndex] || ''}
                        onChange={(e) => onPharmacistSelect(pharmacy.id, slotIndex, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                      >
                        <option value="">薬剤師を選択してください</option>
                        {(availablePharmacists || [])
                          .filter((p: any) => p && p.id)
                          .map((pharmacist: any) => (
                            <option
                              key={pharmacist.id}
                              value={pharmacist.id}
                              disabled={
                                manualMatches[pharmacy.id]?.includes(pharmacist.id) &&
                                manualMatches[pharmacy.id]?.[slotIndex] !== pharmacist.id
                              }
                            >
                              {pharmacist.name || `薬剤師${pharmacist.id?.slice(-4) || 'unknown'}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ))}
      </div>

      {/* 手動マッチング確定ボタン - 非表示 */}
      {false && hasManualSelections && (
        <div className="mt-3 pt-2 border-t border-red-200">
          <button
            onClick={onSaveManualMatches}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs font-medium"
          >
            選択した薬剤師を希望シフトとして保存
            <br />
            <span className="text-xs opacity-90">（新しいシフト希望が作成されます）</span>
          </button>
        </div>
      )}
    </div>
  );
};
