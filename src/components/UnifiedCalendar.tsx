import React from 'react';
import { Calendar } from 'lucide-react';

interface UnifiedCalendarProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  getMonthName: (date: Date) => string;
  children: React.ReactNode;
  className?: string;
}

const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  getMonthName,
  children,
  className = ""
}) => {
  return (
    <div className={`flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 ${className}`}>
      {/* ナビゲーション */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onPreviousMonth} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
          <button 
            onClick={onNextMonth} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['日','月','火','水','木','金','土'].map(d => (
          <div key={d} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド（子コンポーネントで実装） */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {children}
      </div>
    </div>
  );
};

export default UnifiedCalendar;
