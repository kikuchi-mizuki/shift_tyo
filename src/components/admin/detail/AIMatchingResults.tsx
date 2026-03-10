/**
 * AIMatchingResults.tsx
 * AIマッチング結果の表示コンポーネント
 */

import React from 'react';
import { Brain, RefreshCw, RotateCcw } from 'lucide-react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface AIMatchingResultsProps {
  matches: any[];
  userProfiles: any;
  postings: any[];
  onConfirmMatch: (match: any) => void;
  candidatesByStore?: Map<string, any[]>;
  onPharmacistChange?: (storeKey: string, newPharmacistId: string) => void;
  isReoptimizing?: boolean;
  onResetToInitial?: () => void;
  hasManualChanges?: boolean;
}

export const AIMatchingResults: React.FC<AIMatchingResultsProps> = ({
  matches,
  userProfiles,
  postings,
  onConfirmMatch,
  candidatesByStore,
  onPharmacistChange,
  isReoptimizing = false,
  onResetToInitial,
  hasManualChanges = false
}) => {
  if (safeLength(matches) === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-semibold text-purple-800">
            AIマッチング結果 {safeLength(matches)}件
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          {hasManualChanges && onResetToInitial && (
            <button
              onClick={onResetToInitial}
              disabled={isReoptimizing}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="手動変更をリセットして初期状態に戻す"
            >
              <RotateCcw className="w-3 h-3" />
              <span>リセット</span>
            </button>
          )}
          {isReoptimizing && (
            <div className="flex items-center space-x-1 text-blue-600 text-xs">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>再最適化中...</span>
            </div>
          )}
        </div>
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

          // 薬局の募集時間を取得
          // 優先順位: 1) match.timeSlot, 2) match.posting, 3) match.start_time/end_time (距離ベース), 4) postingsから検索
          let startTime = '09:00';
          let endTime = '18:00';

          console.log('🕒 AIマッチング時間デバッグ:', {
            index,
            pharmacyId,
            'match.timeSlot': match.timeSlot,
            'match.posting': match.posting,
            'match.start_time': match.start_time,
            'match.end_time': match.end_time,
            'match.date': match.date,
            'match.algorithm': match.algorithm
          });

          // 1. AIマッチングエンジンが設定したtimeSlotを優先使用
          if (match.timeSlot?.start && match.timeSlot?.end) {
            startTime = match.timeSlot.start.substring(0, 5);
            endTime = match.timeSlot.end.substring(0, 5);
            console.log('✅ timeSlotから取得:', { startTime, endTime });
          }
          // 2. matchに含まれているpostingデータを使用
          else if (match.posting?.start_time && match.posting?.end_time) {
            startTime = match.posting.start_time.substring(0, 5);
            endTime = match.posting.end_time.substring(0, 5);
            console.log('✅ match.postingから取得:', { startTime, endTime });
          }
          // 3. 距離ベースマッチングの場合: match.start_time/end_timeを直接使用
          else if (match.start_time && match.end_time) {
            startTime = match.start_time.substring(0, 5);
            endTime = match.end_time.substring(0, 5);
            console.log('✅ match.start_time/end_timeから取得 (距離ベース):', { startTime, endTime });
          }
          // 4. 最後の手段: pharmacy_idとdateから対応するpostingを検索
          else {
            const matchDate = match.date || match.timeSlot?.date;
            const posting = postings.find((p: any) =>
              p.pharmacy_id === pharmacyId &&
              (!matchDate || p.date === matchDate)
            );
            if (posting?.start_time && posting?.end_time) {
              startTime = posting.start_time.substring(0, 5);
              endTime = posting.end_time.substring(0, 5);
              console.log('✅ postings配列から取得:', { startTime, endTime, posting });
            } else {
              console.warn('⚠️ 時間取得失敗 - デフォルト値を使用:', { startTime, endTime });
            }
          }

          // compatibilityScoreの安全な取得（undefinedの場合は0.8をデフォルト値として使用）
          const compatibilityScore = typeof match.compatibilityScore === 'number' && !isNaN(match.compatibilityScore)
            ? match.compatibilityScore
            : 0.8;
          const score = Math.round(compatibilityScore * 100);

          const reasons = (match.reasons || []).slice(0, 2).join(', ');

          // 店舗名が薬局名と異なる場合のみ表示（会社名の重複表示を避ける）
          const showStoreName = storeName &&
                               storeName !== '店舗名未設定' &&
                               storeName !== pharmacyName &&
                               storeName.trim() !== '';

          // 店舗キーを生成
          const storeKey = `${pharmacyId}_${(storeName || '').trim()}`;

          // この店舗の候補者リストを取得
          const candidates = candidatesByStore?.get(storeKey) || [];

          // プルダウンを表示するか（候補者が2人以上いて、機能が有効な場合）
          const showDropdown = candidatesByStore && onPharmacistChange && candidates.length > 0;

          // 固定されたマッチかどうか
          const isLocked = match.isLocked === true;

          return (
            <div key={index} className="bg-white rounded border p-2 text-xs">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* 薬剤師選択プルダウン */}
                  {showDropdown ? (
                    <div className="mb-1">
                      <label className="text-[10px] text-gray-500 block mb-0.5">
                        薬剤師 {isLocked && <span className="text-blue-600">(固定)</span>}
                      </label>
                      <select
                        value={pharmacistId}
                        onChange={(e) => onPharmacistChange(storeKey, e.target.value)}
                        disabled={isReoptimizing}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 w-full bg-white disabled:opacity-50"
                      >
                        {candidates.map((candidate: any) => (
                          <option key={candidate.pharmacistId} value={candidate.pharmacistId}>
                            {candidate.pharmacistName}
                            {candidate.isAssignedElsewhere && ` (現在: ${candidate.assignedTo})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="font-medium text-gray-800">
                      {pharmacistName}
                      {isLocked && <span className="text-blue-600 text-[10px] ml-1">(固定)</span>}
                    </div>
                  )}

                  <div className="font-medium text-gray-800">
                    → {pharmacyName}
                  </div>
                  {showStoreName && (
                    <div className="text-gray-600">
                      店舗: {storeName}
                    </div>
                  )}
                  <div className="text-gray-600">
                    {startTime} - {endTime}
                  </div>
                  {match.memo && (
                    <div className="text-[11px] text-gray-600 mt-1 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                      <span className="font-medium text-gray-700">備考:</span> {match.memo}
                    </div>
                  )}
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
