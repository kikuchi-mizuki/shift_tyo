/**
 * AIMatchingResults.tsx
 * AIマッチング結果の表示コンポーネント
 */

import React from 'react';
import { Brain } from 'lucide-react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface AIMatchingResultsProps {
  matches: any[];
  userProfiles: any;
  onConfirmMatch: (match: any) => void;
}

export const AIMatchingResults: React.FC<AIMatchingResultsProps> = ({
  matches,
  userProfiles,
  onConfirmMatch
}) => {
  if (safeLength(matches) === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
      <div className="flex items-center space-x-2 mb-2">
        <Brain className="w-4 h-4 text-purple-600" />
        <h4 className="text-sm font-semibold text-purple-800">
          AIマッチング結果 {safeLength(matches)}件
        </h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {matches.map((match, index) => {
          const pharmacistName = match.pharmacist?.name || userProfiles[match.pharmacist.id]?.name || '薬剤師名未設定';
          const pharmacyName = match.pharmacy?.name || userProfiles[match.pharmacy.id]?.name || '薬局名未設定';
          const storeName = match.posting?.store_name || match.pharmacy?.store_name || '店舗名未設定';
          const startTime = match.timeSlot?.start || match.posting?.start_time || '09:00';
          const endTime = match.timeSlot?.end || match.posting?.end_time || '18:00';
          const score = Math.round(match.compatibilityScore * 100);
          const reasons = (match.reasons || []).slice(0, 2).join(', ');

          return (
            <div key={index} className="bg-white rounded border p-2 text-xs">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {pharmacistName} → {pharmacyName}
                  </div>
                  <div className="text-gray-600">
                    店舗: {storeName}
                  </div>
                  <div className="text-gray-600">
                    {startTime} - {endTime}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-purple-600 font-medium mb-1">
                    {score}%
                  </div>
                  {reasons && (
                    <div className="text-xs text-gray-500 mb-1">
                      {reasons}
                    </div>
                  )}
                  <button
                    onClick={() => onConfirmMatch(match)}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                  >
                    確定
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
