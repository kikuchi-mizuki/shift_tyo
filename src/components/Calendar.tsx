import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { AssignedShift } from '../types';

interface CalendarProps {
  shifts: AssignedShift[];
  month: number;
  year: number;
  onDateClick?: (date: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ shifts, month, year, onDateClick }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  

  const getShiftsForDate = (day: number): AssignedShift[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter(shift => shift.date === dateStr);
  };

  const getTimeSlotColor = (timeSlot: string) => {
    return (shift: AssignedShift) => {
      const isProvisional = shift.status === 'provisional';
      const isConfirmed = shift.status === 'confirmed';
      const isPending = shift.pharmacistId === 'pending';
      const baseColors = {
        morning: isPending ? 'bg-gray-50 text-gray-600 border-gray-300 border-dashed' : 
                 isProvisional ? 'bg-yellow-50 text-yellow-700 border-yellow-400 border-2' : 
                 isConfirmed ? 'bg-yellow-100 text-yellow-800 border-yellow-500 border-2' :
                 'bg-yellow-100 text-yellow-800 border-yellow-200',
        afternoon: isPending ? 'bg-gray-50 text-gray-600 border-gray-300 border-dashed' : 
                   isProvisional ? 'bg-blue-50 text-blue-700 border-blue-400 border-2' : 
                   isConfirmed ? 'bg-blue-100 text-blue-800 border-blue-500 border-2' :
                   'bg-blue-100 text-blue-800 border-blue-200',
        fullday: isPending ? 'bg-gray-50 text-gray-600 border-gray-300 border-dashed' : 
                 isProvisional ? 'bg-orange-50 text-orange-700 border-orange-400 border-2' : 
                 isConfirmed ? 'bg-orange-100 text-orange-800 border-orange-500 border-2' :
                 'bg-orange-100 text-orange-800 border-orange-200',
        negotiable: isPending ? 'bg-gray-50 text-gray-600 border-gray-300 border-dashed' : 
                    isProvisional ? 'bg-purple-50 text-purple-700 border-purple-400 border-2' : 
                    isConfirmed ? 'bg-purple-100 text-purple-800 border-purple-500 border-2' :
                    'bg-purple-100 text-purple-800 border-purple-200'
      };
      return baseColors[timeSlot as keyof typeof baseColors] || baseColors.morning;
    };
  };

  const getTimeSlotLabel = (timeSlot: string) => {
    const labels = {
      morning: '午前',
      afternoon: '午後',
      fullday: '終日',
      negotiable: '相談'
    };
    return labels[timeSlot as keyof typeof labels] || timeSlot;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-center space-x-3">
          <CalendarIcon className="w-6 h-6" />
          <h2 className="text-2xl font-bold">{year}年 {monthNames[month]}</h2>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* 空のセルを追加（月の最初の日より前の曜日分） */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="h-24 border border-gray-200 rounded-lg bg-gray-50"></div>
          ))}
          
          {/* 月の日付を表示 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayShifts = getShiftsForDate(day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            return (
              <div
                key={day}
                className={`h-24 border border-gray-200 rounded-lg p-1 cursor-pointer ${
                  dayShifts.length > 0 ? 'bg-blue-50' : 'bg-white'
                }`}
                onClick={() => onDateClick?.(dateStr)}
              >
                <div className="flex flex-col h-full">
                  <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
                  <div className="flex-1 overflow-hidden">
                    {dayShifts.slice(0, 2).map((shift) => (
                      <div
                        key={shift.id}
                        className={`text-xs px-1 py-0.5 rounded mb-1 border ${getTimeSlotColor(shift.timeSlot)(shift)}`}
                      >
                        {getTimeSlotLabel(shift.timeSlot)}
                        {shift.pharmacistId === 'pending' && <span className="ml-1 text-xs opacity-75">(募集中)</span>}
                        {shift.pharmacyId === 'pending' && <span className="ml-1 text-xs opacity-75">(希望)</span>}
                        {shift.status === 'provisional' && shift.pharmacyId !== 'pending' && <span className="ml-1 text-xs font-semibold">(仮)</span>}
                        {shift.status === 'confirmed' && <span className="ml-1 text-xs font-semibold">(確定)</span>}
                      </div>
                    ))}
                    {dayShifts.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayShifts.length - 2}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};export default Calendar;
