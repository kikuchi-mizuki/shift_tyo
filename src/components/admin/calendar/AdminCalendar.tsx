/**
 * AdminCalendar.tsx
 * カレンダー全体のコンテナコンポーネント
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { getMonthName } from '../../../utils/admin/dateHelpers';

interface AdminCalendarProps {
  currentDate: Date;
  selectedDate: string;
  requests: any[];
  postings: any[];
  assigned: any[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDateSelect: (date: number) => void;
}

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  currentDate,
  selectedDate,
  requests,
  postings,
  assigned,
  onPrevMonth,
  onNextMonth,
  onDateSelect
}) => {
  return (
    <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
      <CalendarHeader
        currentDate={currentDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
        </div>
      </div>

      <CalendarGrid
        currentDate={currentDate}
        selectedDate={selectedDate}
        requests={requests}
        postings={postings}
        assigned={assigned}
        onDateSelect={onDateSelect}
      />
    </div>
  );
};
