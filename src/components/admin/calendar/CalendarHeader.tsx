/**
 * CalendarHeader.tsx
 * カレンダーの月ナビゲーションヘッダー
 */

import React from 'react';
import { getMonthName } from '../../../utils/admin/dateHelpers';

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onPrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="前の月"
        >
          ←
        </button>
        <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="次の月"
        >
          →
        </button>
      </div>
    </div>
  );
};
