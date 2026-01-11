/**
 * AdminPanel.tsx
 * 管理者パネルコンテナコンポーネント
 */

import React from 'react';
import { PanelHeader } from './PanelHeader';
import { ActionButtons } from './ActionButtons';
import { DateDetailPanel } from '../detail/DateDetailPanel';

interface AdminPanelProps {
  // ヘッダー関連
  onPasswordChange: () => void;

  // アクションボタン関連
  recruitmentStatus: any;
  aiMatchingLoading: boolean;
  onToggleRecruitment: () => void;
  onMonthlyMatching: () => void;
  onCSVExport?: (type: 'matching' | 'shortage' | 'requests' | 'postings') => void;

  // 日付詳細パネル関連
  selectedDate: string;
  dateDetailProps: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onPasswordChange,
  recruitmentStatus,
  aiMatchingLoading,
  onToggleRecruitment,
  onMonthlyMatching,
  onCSVExport,
  selectedDate,
  dateDetailProps
}) => {
  return (
    <div className="w-full lg:w-80 xl:w-96 flex flex-col h-[800px]">
      <PanelHeader
        onPasswordChange={onPasswordChange}
      />

      <ActionButtons
        recruitmentStatus={recruitmentStatus}
        aiMatchingLoading={aiMatchingLoading}
        onToggleRecruitment={onToggleRecruitment}
        onMonthlyMatching={onMonthlyMatching}
        onCSVExport={onCSVExport}
      />

      {/* スクロール可能な詳細エリア */}
      <div className="flex-1 overflow-y-auto p-2 pt-2 space-y-2">
        {/* 選択された日付の詳細表示 */}
        {selectedDate && dateDetailProps && (
          <DateDetailPanel {...dateDetailProps} />
        )}
      </div>
    </div>
  );
};
