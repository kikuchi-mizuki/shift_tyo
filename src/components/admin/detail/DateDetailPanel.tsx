/**
 * DateDetailPanel.tsx
 * 選択された日付の詳細情報を表示するパネルコンテナ
 */

import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AIMatchingResults } from './AIMatchingResults';
import { ShortagePharmacies } from './ShortagePharmacies';
import { ConfirmedShifts } from './ConfirmedShifts';
import { PharmacyPostings } from './PharmacyPostings';
import { PharmacistRequests } from './PharmacistRequests';
import { ConsultationRequests } from './ConsultationRequests';
import { safeLength } from '../../../utils/admin/arrayHelpers';
import { useInteractiveMatching } from '../../../hooks/admin/useInteractiveMatching';
import { getAvailableCandidatesForShortageStore } from '../../../services/admin/MatchingService';

interface DateDetailPanelProps {
  selectedDate: string;
  dayData: {
    matches: any[];
    shortages: any[];
    confirmedShifts: any[];
    postings: any[];
    requests: any[];
    consultRequests: any[];
  };
  userProfiles: any;
  availablePharmacists: any[];
  manualMatches: { [pharmacyId: string]: string[] };
  showAddForms: { posting: boolean; request: boolean };
  newPosting: any;
  newRequest: any;
  // インタラクティブマッチング用（オプショナル）
  allRequests?: any[];
  allPostings?: any[];
  allAssigned?: any[];
  ratings?: any[];
  storeNgPharmacists?: { [pharmacyId: string]: any[] };
  storeNgPharmacies?: { [pharmacistId: string]: any[] };
  // イベントハンドラー
  onClose: () => void;
  onConfirmMatch: (match: any) => void;
  onPharmacistSelect: (pharmacyId: string, index: number, pharmacistId: string) => void;
  onSaveManualMatches: () => void;
  onCancelShift: (shiftId: string) => void;
  onTogglePostingForm: () => void;
  onPostingChange: (posting: any) => void;
  onAddPosting: () => void;
  onDeletePosting: (postingId: string) => void;
  onToggleRequestForm: () => void;
  onRequestChange: (request: any) => void;
  onAddRequest: () => void;
  onDeleteRequest: (requestId: string) => void;
}

export const DateDetailPanel: React.FC<DateDetailPanelProps> = ({
  selectedDate,
  dayData,
  userProfiles,
  availablePharmacists,
  manualMatches,
  showAddForms,
  newPosting,
  newRequest,
  allRequests = [],
  allPostings = [],
  allAssigned = [],
  ratings = [],
  storeNgPharmacists,
  storeNgPharmacies,
  onClose,
  onConfirmMatch,
  onPharmacistSelect,
  onSaveManualMatches,
  onCancelShift,
  onTogglePostingForm,
  onPostingChange,
  onAddPosting,
  onDeletePosting,
  onToggleRequestForm,
  onRequestChange,
  onAddRequest,
  onDeleteRequest
}) => {
  // インタラクティブマッチング（オプショナル機能）
  const interactiveMatchingEnabled =
    Array.isArray(allRequests) && allRequests.length > 0 &&
    Array.isArray(allPostings) && allPostings.length > 0 &&
    userProfiles && typeof userProfiles === 'object' &&
    Array.isArray(dayData?.matches);

  const interactiveMatching = useInteractiveMatching({
    supabase: supabase!,
    initialMatches: dayData?.matches || [],
    date: selectedDate,
    requests: allRequests || [],
    postings: allPostings || [],
    assigned: allAssigned || [],
    userProfiles: userProfiles || {},
    ratings: ratings || [],
    storeNgPharmacists,
    storeNgPharmacies
  });

  // 不足薬局用の候補者リストを生成（時間情報を含むstoreKey）
  const shortageCandidatesByStore = useMemo(() => {
    const map = new Map<string, any[]>();

    if (!interactiveMatchingEnabled || !dayData?.shortages) {
      return map;
    }

    for (const shortage of dayData.shortages) {
      if (!shortage || !shortage.id) continue;

      // 時間情報を含むstoreKeyを生成
      const storeKey = `${shortage.id}_${(shortage.store_name || '').trim()}_${shortage.start_time || '09:00'}_${shortage.end_time || '18:00'}`;

      // この不足薬局の募集情報を取得
      const posting = allPostings.find(p =>
        p.pharmacy_id === shortage.id &&
        p.date === selectedDate &&
        (p.store_name || '').trim() === (shortage.store_name || '').trim() &&
        (p.start_time ? String(p.start_time).substring(0, 5) : '09:00') === (shortage.start_time || '09:00') &&
        (p.end_time ? String(p.end_time).substring(0, 5) : '18:00') === (shortage.end_time || '18:00')
      );

      if (!posting) continue;

      // この店舗に割り当て可能な全薬剤師を取得（時間互換性チェックなし、確定済み除外）
      const candidates = getAvailableCandidatesForShortageStore(
        storeKey,
        posting,
        allRequests.filter(r => r && r.date === selectedDate),
        userProfiles,
        ratings || [],
        allRequests,
        storeNgPharmacists,
        storeNgPharmacies
      );

      // 候補者情報を整形
      const formattedCandidates = candidates.map(c => {
        const pharmacistProfile = userProfiles[c.pharmacistId];

        // 薬剤師名の取得
        let pharmacistName = '薬剤師名未設定';
        if (pharmacistProfile) {
          if (pharmacistProfile.name && pharmacistProfile.name.trim()) {
            pharmacistName = pharmacistProfile.name.trim();
          } else if (pharmacistProfile.email && pharmacistProfile.email.trim()) {
            pharmacistName = pharmacistProfile.email.split('@')[0];
          } else if (c.pharmacistId) {
            pharmacistName = `薬剤師${c.pharmacistId.slice(-4)}`;
          }
        } else if (c.pharmacistId) {
          pharmacistName = `薬剤師${c.pharmacistId.slice(-4)}`;
        }

        // 現在他の薬局に割り当てられているかチェック
        const currentAssignment = interactiveMatching.matches.find(m =>
          m && m.pharmacist && m.pharmacist.id === c.pharmacistId
        );

        let assignmentStoreKey = '';
        if (currentAssignment) {
          const assignedStoreName = currentAssignment.posting?.store_name || '';
          const assignedStartTime = currentAssignment.timeSlot?.start ? String(currentAssignment.timeSlot.start).substring(0, 5) : '09:00';
          const assignedEndTime = currentAssignment.timeSlot?.end ? String(currentAssignment.timeSlot.end).substring(0, 5) : '18:00';
          assignmentStoreKey = `${currentAssignment.pharmacy.id}_${assignedStoreName.trim()}_${assignedStartTime}_${assignedEndTime}`;
        }

        const isAssignedElsewhere = currentAssignment && assignmentStoreKey !== storeKey;

        return {
          pharmacistId: c.pharmacistId,
          pharmacistName,
          score: c.score,
          isAssignedElsewhere,
          assignedTo: isAssignedElsewhere && currentAssignment ? currentAssignment.pharmacy.name : null
        };
      });

      map.set(storeKey, formattedCandidates);
    }

    return map;
  }, [interactiveMatchingEnabled, dayData?.shortages, allPostings, allRequests, selectedDate, userProfiles, ratings, storeNgPharmacists, storeNgPharmacies, interactiveMatching.matches]);

  const date = new Date(selectedDate);
  const dateDisplay = `${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <h3 className="text-lg font-semibold">日付詳細</h3>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white text-sm"
          >
            ✕ 閉じる
          </button>
        </div>
        <p className="text-sm text-blue-100 mt-1">{dateDisplay}の詳細情報</p>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4">
        {/* AIマッチング結果 */}
        <AIMatchingResults
          matches={interactiveMatchingEnabled ? interactiveMatching.matches : dayData.matches}
          userProfiles={userProfiles}
          postings={dayData.postings}
          onConfirmMatch={onConfirmMatch}
          candidatesByStore={interactiveMatchingEnabled ? interactiveMatching.candidatesByStore : undefined}
          onPharmacistChange={interactiveMatchingEnabled ? interactiveMatching.handlePharmacistChange : undefined}
          isReoptimizing={interactiveMatchingEnabled ? interactiveMatching.isReoptimizing : false}
          onResetToInitial={interactiveMatchingEnabled ? interactiveMatching.resetToInitial : undefined}
          hasManualChanges={interactiveMatchingEnabled && safeLength(interactiveMatching.lockedAssignments) > 0}
        />

        {/* 不足薬局 */}
        <ShortagePharmacies
          shortages={dayData.shortages}
          availablePharmacists={availablePharmacists}
          manualMatches={manualMatches}
          onPharmacistSelect={onPharmacistSelect}
          onSaveManualMatches={onSaveManualMatches}
          candidatesByStore={interactiveMatchingEnabled ? shortageCandidatesByStore : undefined}
          onPharmacistChange={interactiveMatchingEnabled ? interactiveMatching.handlePharmacistChange : undefined}
          isReoptimizing={interactiveMatchingEnabled ? interactiveMatching.isReoptimizing : false}
          matches={interactiveMatchingEnabled ? interactiveMatching.matches : dayData.matches}
        />

        {/* 確定シフト */}
        <ConfirmedShifts
          shifts={dayData.confirmedShifts}
          userProfiles={userProfiles}
          onCancel={onCancelShift}
        />

        {/* 薬局募集 */}
        <PharmacyPostings
          postings={dayData.postings}
          userProfiles={userProfiles}
          showAddForm={showAddForms.posting}
          newPosting={newPosting}
          onToggleAddForm={onTogglePostingForm}
          onPostingChange={onPostingChange}
          onAdd={onAddPosting}
          onDelete={onDeletePosting}
        />

        {/* 薬剤師希望 */}
        <PharmacistRequests
          requests={dayData.requests}
          userProfiles={userProfiles}
          showAddForm={showAddForms.request}
          newRequest={newRequest}
          onToggleAddForm={onToggleRequestForm}
          onRequestChange={onRequestChange}
          onAdd={onAddRequest}
          onDelete={onDeleteRequest}
        />

        {/* 要相談リクエスト */}
        <ConsultationRequests
          consultRequests={dayData.consultRequests}
          userProfiles={userProfiles}
        />
      </div>
    </div>
  );
};
