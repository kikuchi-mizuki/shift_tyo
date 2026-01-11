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
      {/* 1ヶ月分のシフト自動組み */}
      <div className="bg-white rounded-lg shadow p-2 mb-2">
        <button
          onClick={onMonthlyMatching}
          disabled={aiMatchingLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {aiMatchingLoading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>AI分析中...</span>
            </>
          ) : (
            <>
              <Zap className="w-3 h-3" />
              <span>1ヶ月分のシフトを自動で組む</span>
            </>
          )}
        </button>
      </div>

      {/* CSV出力 */}
      {onCSVExport && (
        <div className="bg-white rounded-lg shadow p-2 mb-2 relative">
          <button
            onClick={() => setShowCSVMenu(!showCSVMenu)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            <span>CSV出力</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showCSVMenu ? 'rotate-180' : ''}`} />
          </button>

          {showCSVMenu && (
            <div className="absolute left-0 right-0 mt-2 mx-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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
      <div className="bg-white rounded-lg shadow p-2 mb-2">
        <button
          onClick={onToggleRecruitment}
          className={`w-full py-1.5 px-3 rounded text-sm ${
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
