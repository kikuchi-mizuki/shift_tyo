import React from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell, Lock } from 'lucide-react';

interface AdminCalendarProps {
  currentDate: Date;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  getMonthName: (date: Date) => string;
  getDaysInMonth: (date: Date) => number[];
  getMatchingStatus: (date: string) => {
    count: number;
    unconfirmedMatches: number;
    shortage: number;
  };
  getConsultRequests: (date: string) => any[];
  safeLength: (arr: any) => number;
}

const AdminCalendar: React.FC<AdminCalendarProps> = ({
  currentDate,
  selectedDate,
  onDateSelect,
  onPreviousMonth,
  onNextMonth,
  getMonthName,
  getDaysInMonth,
  getMatchingStatus,
  getConsultRequests,
  safeLength
}) => {
  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Calendar className="h-5 w-5" />
        </button>
        <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Calendar className="h-5 w-5" />
        </button>
      </div>

      {/* カレンダー表示 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
        </div>
        
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-gray-50">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">{d}</div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1 p-2">
          {days.map((d) => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const matchingStatus = getMatchingStatus(dateStr);
            const dayConsultRequests = getConsultRequests(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={d}
                className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                  isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                } ${isToday ? 'bg-yellow-50' : ''} cursor-pointer transition-colors`}
                onClick={() => onDateSelect(dateStr)}
              >
                <div className="font-medium">{d}</div>
                
                {/* マッチング状況表示 */}
                <div className="mt-1 space-y-1">
                  {matchingStatus.count > 0 && (
                    <div className="flex items-center justify-center text-green-600">
                      <span className="sm:hidden">確{matchingStatus.count}</span>
                      <span className="hidden sm:inline">確定 {matchingStatus.count}件</span>
                    </div>
                  )}
                  
                  {matchingStatus.unconfirmedMatches > 0 && (
                    <div className="flex items-center justify-center text-blue-600">
                      <span className="sm:hidden">マ{matchingStatus.unconfirmedMatches}</span>
                      <span className="hidden sm:inline">マッチ {matchingStatus.unconfirmedMatches}</span>
                    </div>
                  )}
                  
                  {matchingStatus.shortage > 0 && (
                    <div className="flex items-center justify-center text-red-600">
                      <span className="sm:hidden">不{matchingStatus.shortage}</span>
                      <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                    </div>
                  )}
                  
                  {safeLength(dayConsultRequests) > 0 && (
                    <div className="flex items-center justify-center text-orange-600">
                      <span className="sm:hidden">相{safeLength(dayConsultRequests)}</span>
                      <span className="hidden sm:inline">相談 {safeLength(dayConsultRequests)}</span>
                    </div>
                  )}
                </div>

                {/* アイコン表示 */}
                <div className="mt-1 flex justify-center">
                  {matchingStatus.count > 0 && (
                    <div className="flex items-center text-green-600">
                      <span className="sm:hidden">マ{matchingStatus.count}</span>
                      <span className="hidden sm:inline">マッチ {matchingStatus.count}</span>
                    </div>
                  )}
                  
                  {matchingStatus.shortage > 0 && (
                    <div className="flex items-center text-red-600">
                      <span className="sm:hidden">不{matchingStatus.shortage}</span>
                      <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                    </div>
                  )}
                  
                  {safeLength(dayConsultRequests) > 0 && (
                    <div className="flex items-center text-orange-600">
                      <span className="sm:hidden">相{safeLength(dayConsultRequests)}</span>
                      <span className="hidden sm:inline">相談 {safeLength(dayConsultRequests)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
