/**
 * ActionButtons.tsx
 * 管理者パネルのアクションボタンコンポーネント
 */

import React, { useState } from 'react';
import { Zap, Download, ChevronDown } from 'lucide-react';

interface ActionButtonsProps {
  recruitmentStatus: any;
  aiMatchingLoading: boolean;
  onToggleRecruitment: () => void;
  onMonthlyMatching: () => void;
  onCSVExport?: (type: 'matching' | 'shortage' | 'requests' | 'postings' | 'all') => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  recruitmentStatus,
  aiMatchingLoading,
  onToggleRecruitment,
  onMonthlyMatching,
  onCSVExport
}) => {
  const [showCSVMenu, setShowCSVMenu] = useState(false);

  return (
    <div className="p-2 pb-0 flex-shrink-0">
      {/* ボタン3つを横並び */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* 1ヶ月分のシフト自動組み */}
        <button
          onClick={onMonthlyMatching}
          disabled={aiMatchingLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
        >
          {aiMatchingLoading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span className="hidden xl:inline">AI分析中...</span>
            </>
          ) : (
            <>
              <Zap className="w-3 h-3" />
              <span className="hidden xl:inline">シフト自動</span>
            </>
          )}
        </button>

        {/* CSV出力 */}
        {onCSVExport && (
          <div className="relative">
            <button
              onClick={() => setShowCSVMenu(!showCSVMenu)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded text-xs font-medium flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span className="hidden xl:inline">CSV</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showCSVMenu ? 'rotate-180' : ''}`} />
            </button>

            {showCSVMenu && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onCSVExport('all');
                  setShowCSVMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-t-lg"
              >
                📊 全データ一覧
              </button>
              <button
                onClick={() => {
                  onCSVExport('matching');
                  setShowCSVMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-t"
              >
                マッチング一覧
              </button>
              <button
                onClick={() => {
                  onCSVExport('shortage');
                  setShowCSVMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-t"
              >
                不足薬局一覧
              </button>
              <button
                onClick={() => {
                  onCSVExport('requests');
                  setShowCSVMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-t"
              >
                応募薬剤師一覧
              </button>
              <button
                onClick={() => {
                  onCSVExport('postings');
                  setShowCSVMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-t rounded-b-lg"
              >
                募集薬局一覧
              </button>
            </div>
          )}
          </div>
        )}

        {/* 募集管理 */}
        <button
          onClick={onToggleRecruitment}
          className={`py-2 px-2 rounded text-xs font-medium ${
            recruitmentStatus.is_open
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <span className="hidden xl:inline">{recruitmentStatus.is_open ? '募集を締め切る' : '募集を再開する'}</span>
          <span className="xl:hidden">{recruitmentStatus.is_open ? '締切' : '募集'}</span>
        </button>
      </div>
    </div>
  );
};
