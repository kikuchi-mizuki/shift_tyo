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
          // userProfilesから名前を取得（フォールバック: name → email → ID末尾4桁）
          const pharmacistId = match.pharmacist_id || match.pharmacist?.id;
          const pharmacyId = match.pharmacy_id || match.pharmacy?.id;

          let pharmacistName = '薬剤師名未設定';
          if (pharmacistId && userProfiles[pharmacistId]) {
            const profile = userProfiles[pharmacistId];
            if (profile.name && profile.name.trim()) {
              pharmacistName = profile.name.trim();
            } else if (profile.email && profile.email.trim()) {
              pharmacistName = profile.email.split('@')[0];
            } else {
              pharmacistName = `薬剤師${pharmacistId.slice(-4)}`;
            }
          } else if (pharmacistId) {
            pharmacistName = `薬剤師${pharmacistId.slice(-4)}`;
          }

          let pharmacyName = '薬局名未設定';
          if (pharmacyId && userProfiles[pharmacyId]) {
            const profile = userProfiles[pharmacyId];
            if (profile.name && profile.name.trim()) {
              pharmacyName = profile.name.trim();
            } else if (profile.email && profile.email.trim()) {
              pharmacyName = profile.email.split('@')[0];
            } else {
              pharmacyName = `薬局${pharmacyId.slice(-4)}`;
            }
          } else if (pharmacyId) {
            pharmacyName = `薬局${pharmacyId.slice(-4)}`;
          }

          // 店舗名の取得
          let storeName = '店舗名未設定';
          if (match.store_name) {
            storeName = match.store_name;
          } else if (match.posting?.store_name) {
            storeName = match.posting.store_name;
          } else if (pharmacyId && userProfiles[pharmacyId]) {
            const profile = userProfiles[pharmacyId];
            storeName = profile.store_name || profile.name || '店舗名未設定';
          }

          // デバッグ：matchオブジェクトの構造を確認
          console.error('🔍 [DEBUG] Match object:', {
            time_slot: match.time_slot,
            timeSlot: match.timeSlot,
            posting: match.posting,
            allKeys: Object.keys(match)
          });

          // 時間の取得（薬局の募集時間を優先）
          let startTime = '09:00';
          let endTime = '18:00';

          // assigned_shiftsのtime_slotをパース（"09:00-18:00"形式の場合）
          if (match.time_slot && typeof match.time_slot === 'string') {
            const parts = match.time_slot.split('-');
            if (parts.length === 2) {
              startTime = parts[0].trim();
              endTime = parts[1].trim();
            }
          } else if (match.timeSlot) {
            startTime = match.timeSlot.start || '09:00';
            endTime = match.timeSlot.end || '18:00';
          } else if (match.posting) {
            startTime = match.posting.start_time || '09:00';
            endTime = match.posting.end_time || '18:00';
          }

          // compatibilityScoreの安全な取得（undefinedの場合は0.8をデフォルト値として使用）
          const compatibilityScore = typeof match.compatibilityScore === 'number' && !isNaN(match.compatibilityScore)
            ? match.compatibilityScore
            : 0.8;
          const score = Math.round(compatibilityScore * 100);

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
