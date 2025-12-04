/**
 * AdminPanel.tsx
 * 管理者パネルコンテナコンポーネント
 */

import React from 'react';
import { PanelHeader } from './PanelHeader';
import { ActionButtons } from './ActionButtons';
import { DateDetailPanel } from '../detail/DateDetailPanel';
import { UserManagement } from '../users/UserManagement';

interface AdminPanelProps {
  // ヘッダー関連
  onPasswordChange: () => void;
  onDebug: () => void;

  // アクションボタン関連
  recruitmentStatus: any;
  aiMatchingLoading: boolean;
  onToggleRecruitment: () => void;
  onMonthlyMatching: () => void;

  // 日付詳細パネル関連
  selectedDate: string;
  dateDetailProps: any;

  // ユーザー管理関連
  userManagementProps: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onPasswordChange,
  onDebug,
  recruitmentStatus,
  aiMatchingLoading,
  onToggleRecruitment,
  onMonthlyMatching,
  selectedDate,
  dateDetailProps,
  userManagementProps
}) => {
  return (
    <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow border border-purple-200 flex flex-col h-[800px]">
      <PanelHeader
        onPasswordChange={onPasswordChange}
        onDebug={onDebug}
      />

      <ActionButtons
        recruitmentStatus={recruitmentStatus}
        aiMatchingLoading={aiMatchingLoading}
        onToggleRecruitment={onToggleRecruitment}
        onMonthlyMatching={onMonthlyMatching}
      />

      {/* スクロール可能な詳細エリア */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-4 space-y-4">
        {/* 選択された日付の詳細表示 */}
        {selectedDate && dateDetailProps && (
          <DateDetailPanel {...dateDetailProps} />
        )}

        {/* ユーザー管理 */}
        {userManagementProps && (
          <UserManagement {...userManagementProps} />
        )}
      </div>
    </div>
  );
};
