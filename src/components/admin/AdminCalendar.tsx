import React from 'react';
import { Calendar } from 'lucide-react';
import UnifiedCalendar from '../UnifiedCalendar';
import { getMonthName, getDaysInMonth, formatDateString, safeLength } from '../../utils/calendarUtils';

interface AdminCalendarProps {
  currentDate: Date;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  assigned: any[];
  requests: any[];
  postings: any[];
  userProfiles: any;
  aiMatchesByDate: { [date: string]: any[] };
  monthlyMatchingExecuted: boolean;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({
  currentDate,
  selectedDate,
  onDateSelect,
  onPreviousMonth,
  onNextMonth,
  assigned,
  requests,
  postings,
  userProfiles,
  aiMatchesByDate,
  monthlyMatchingExecuted
}) => {
  // カレンダーの日付セルをレンダリング
  const renderDayCell = (day: number, isCurrentMonth: boolean) => {
    const dateStr = formatDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const isSelected = selectedDate === dateStr;
    const isToday = dateStr === formatDateString(new Date());

    // その日のデータを取得
    const dayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === dateStr) : [];
    const dayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === dateStr) : [];
    const dayAssignedShifts = Array.isArray(assigned) ? assigned.filter((s: any) => s.date === dateStr) : [];
    const dayMatches = aiMatchesByDate[dateStr] || [];

    // マッチング状況を計算（元のロジックと同じ）
    const calculateMatchingStatus = () => {
      const totalRequired = dayPostings.reduce((sum, posting) => sum + (posting.required_staff || 1), 0);
      const confirmedCount = dayAssignedShifts.filter((s: any) => s.status === 'confirmed').length;
      const pendingCount = dayAssignedShifts.filter((s: any) => s.status === 'pending').length;
      const unconfirmedMatches = safeLength(dayMatches);
      const totalMatched = confirmedCount + pendingCount + unconfirmedMatches;
      const totalShortage = Math.max(0, totalRequired - totalMatched);

      return {
        totalRequired,
        confirmedCount,
        pendingCount,
        unconfirmedMatches,
        totalMatched,
        totalShortage,
        hasShortage: totalShortage > 0
      };
    };

    const matchingStatus = calculateMatchingStatus();

    return (
      <div
        key={day}
        className={`
          relative p-2 h-20 border border-gray-200 cursor-pointer transition-colors
          ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
          ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
          ${isToday ? 'ring-2 ring-blue-300' : ''}
        `}
        onClick={() => onDateSelect(dateStr)}
      >
        <div className="text-sm font-medium mb-1">{day}</div>
        
        {/* マッチング状況の表示 */}
        {matchingStatus.totalRequired > 0 && (
          <div className="space-y-1">
            {matchingStatus.confirmedCount > 0 && (
              <div className="bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded text-center">
                確定 {matchingStatus.confirmedCount}
              </div>
            )}
            {(matchingStatus.pendingCount > 0 || matchingStatus.unconfirmedMatches > 0) && (
              <div className="bg-purple-100 text-purple-800 text-xs px-1 py-0.5 rounded text-center">
                マッチ {matchingStatus.pendingCount + matchingStatus.unconfirmedMatches}
              </div>
            )}
            {matchingStatus.hasShortage && (
              <div className="bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded text-center">
                不足
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <UnifiedCalendar
      currentDate={currentDate}
      onPreviousMonth={onPreviousMonth}
      onNextMonth={onNextMonth}
      getMonthName={getMonthName}
      className="flex-1"
    >
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {/* 前月の日付 */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => {
          const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
          const daysInPrevMonth = getDaysInMonth(prevMonth);
          const day = daysInPrevMonth - firstDayOfMonth + i + 1;
          return renderDayCell(day, false);
        })}
        
        {/* 今月の日付 */}
        {Array.from({ length: daysInMonth }, (_, i) => renderDayCell(i + 1, true))}
        
        {/* 来月の日付 */}
        {Array.from({ length: 42 - firstDayOfMonth - daysInMonth }, (_, i) => renderDayCell(i + 1, false))}
      </div>
    </UnifiedCalendar>
  );
};

export default AdminCalendar;