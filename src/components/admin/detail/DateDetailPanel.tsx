/**
 * DateDetailPanel.tsx
 * 選択された日付の詳細情報を表示するパネルコンテナ
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { AIMatchingResults } from './AIMatchingResults';
import { ShortagePharmacies } from './ShortagePharmacies';
import { ConfirmedShifts } from './ConfirmedShifts';
import { PharmacyPostings } from './PharmacyPostings';
import { PharmacistRequests } from './PharmacistRequests';
import { ConsultationRequests } from './ConsultationRequests';
import { safeLength } from '../../../utils/admin/arrayHelpers';

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
          matches={dayData.matches}
          userProfiles={userProfiles}
          onConfirmMatch={onConfirmMatch}
        />

        {/* 不足薬局 */}
        <ShortagePharmacies
          shortages={dayData.shortages}
          availablePharmacists={availablePharmacists}
          manualMatches={manualMatches}
          onPharmacistSelect={onPharmacistSelect}
          onSaveManualMatches={onSaveManualMatches}
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
