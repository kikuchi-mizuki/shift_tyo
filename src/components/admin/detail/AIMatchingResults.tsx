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
  postings: any[];
  onConfirmMatch: (match: any) => void;
}

export const AIMatchingResults: React.FC<AIMatchingResultsProps> = ({
  matches,
  userProfiles,
  postings,
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

          // 店舗名の取得（薬局名をフォールバックとして使わない）
          let storeName = '店舗名未設定';

          console.log('🔍 Match object:', {
            match_store_name: match.store_name,
            match_pharmacy_store_name: match.pharmacy?.store_name,
            match_posting_store_name: match.posting?.store_name,
            pharmacyId,
            userProfile_store_name: userProfiles[pharmacyId]?.store_name
          });

          // match.pharmacy.store_nameを優先的に使用
          if (match.pharmacy?.store_name) {
            storeName = match.pharmacy.store_name;
          } else if (match.posting?.store_name) {
            storeName = match.posting.store_name;
          } else if (match.store_name) {
            storeName = match.store_name;
          } else {
            // postingsから検索して店舗名を取得
            const posting = postings.find((p: any) => p.pharmacy_id === pharmacyId);

            if (posting?.store_name) {
              storeName = posting.store_name;
            } else if (pharmacyId && userProfiles[pharmacyId]?.store_name) {
              storeName = userProfiles[pharmacyId].store_name;
            }
          }

          console.log('🔍 Final storeName:', storeName);

          // 薬局の募集時間を取得（postingsから検索）
          let startTime = '09:00';
          let endTime = '18:00';

          // pharmacy_idから対応するpostingを検索
          const posting = postings.find((p: any) => p.pharmacy_id === pharmacyId);
          if (posting) {
            // 募集時間をパース（"11:00:00-19:00:00"形式）
            if (posting.start_time) {
              startTime = posting.start_time.substring(0, 5); // "11:00:00" → "11:00"
            }
            if (posting.end_time) {
              endTime = posting.end_time.substring(0, 5); // "19:00:00" → "19:00"
            }
          } else if (match.posting) {
            // matchに含まれているpostingデータを使用
            startTime = match.posting.start_time?.substring(0, 5) || '09:00';
            endTime = match.posting.end_time?.substring(0, 5) || '18:00';
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
