/**
 * DateCell.tsx
 * カレンダーの日付セル（確定数、マッチ数、不足数表示）
 */

import React from 'react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface DateCellProps {
  date: number | null;
  dateStr: string;
  isSelected: boolean;
  confirmedCount: number;
  matchedCount: number;
  shortage: number;
  consultCount: number;
  onSelect: (date: number) => void;
}

export const DateCell: React.FC<DateCellProps> = React.memo(({
  date,
  dateStr,
  isSelected,
  confirmedCount,
  matchedCount,
  shortage,
  consultCount,
  onSelect
}) => {
  // 空白セル（月の範囲外の日付）
  if (date === null) {
    return (
      <div className="p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] bg-gray-50">
      </div>
    );
  }

  const hasData = confirmedCount > 0 || matchedCount > 0 || shortage > 0 || consultCount > 0;

  return (
    <div
      className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
        date ? 'cursor-pointer' : 'bg-gray-50'
      } ${
        isSelected ? 'bg-blue-100 border-blue-300' : ''
      }`}
      onClick={() => date && onSelect(date)}
    >
      <div className="font-medium">{date}</div>

      {/* マッチング状況表示 */}
      {hasData && (
        <div className="relative group">
          <div className="text-[7px] sm:text-[8px] space-y-0.5">
            {/* 確定件数 */}
            {confirmedCount > 0 && (
              <div className="text-green-600 bg-green-50 border border-green-200 rounded px-1 inline-block">
                <span className="sm:hidden">確</span>
                <span className="hidden sm:inline">確定</span>
              </div>
            )}

            {/* マッチ件数 */}
            {matchedCount > 0 && (
              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                <span className="sm:hidden">マ</span>
                <span className="hidden sm:inline">マッチ</span>
              </div>
            )}

            {/* 不足件数 */}
            {shortage > 0 && (
              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                <span className="sm:hidden">不</span>
                <span className="hidden sm:inline">不足</span>
              </div>
            )}

            {/* 相談数 */}
            {consultCount > 0 && (
              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                <span className="sm:hidden">相{consultCount}</span>
                <span className="hidden sm:inline">相談 {consultCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
