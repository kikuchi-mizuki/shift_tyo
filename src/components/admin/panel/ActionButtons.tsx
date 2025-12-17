/**
 * ActionButtons.tsx
 * 管理者パネルのアクションボタンコンポーネント
 */

import React from 'react';
import { Zap } from 'lucide-react';

interface ActionButtonsProps {
  recruitmentStatus: any;
  aiMatchingLoading: boolean;
  onToggleRecruitment: () => void;
  onMonthlyMatching: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  recruitmentStatus,
  aiMatchingLoading,
  onToggleRecruitment,
  onMonthlyMatching
}) => {
  return (
    <div className="p-4 lg:p-6 pb-0 flex-shrink-0">
      {/* 1ヶ月分のシフト自動組み */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={onMonthlyMatching}
          disabled={aiMatchingLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {aiMatchingLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>AI分析中...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>1ヶ月分のシフトを自動で組む</span>
            </>
          )}
        </button>
      </div>

      {/* 募集管理 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={onToggleRecruitment}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm ${
            recruitmentStatus.is_open
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {recruitmentStatus.is_open ? '募集を締め切る' : '募集を再開する'}
        </button>
      </div>
    </div>
  );
};
