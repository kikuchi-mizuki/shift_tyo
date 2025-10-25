import React from 'react';
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
  filterConfirmedRequestsAndPostings: (requests: any[], postings: any[]) => any;
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
  monthlyMatchingExecuted,
  filterConfirmedRequestsAndPostings
}) => {
  return (
    <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
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
          <span className="text-xl font-semibold">{getMonthName(currentDate)}</span>
        </div>
      </div>

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
        {getDaysInMonth(currentDate).map((d, i) => {
          // dがnullの場合は空白セルを返す
          if (d === null) {
            return (
              <div key={i} className="p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] bg-gray-50">
              </div>
            );
          }

          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d?.toString().padStart(2, '0')}`;
          
          
          // その日の確定シフトを取得（安全な配列チェック）
          const dayAssignedShifts = Array.isArray(assigned) ? assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed') : [];
          
          // デバッグ用：確定シフトの詳細をログ出力
          if (safeLength(dayAssignedShifts) > 0) {
            console.log(`日付 ${dateStr} の確定シフト:`, dayAssignedShifts);
          }
          
          // その日の希望と募集を取得（要相談を除外、安全な配列チェック）
          const allDayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult') : [];
          const allDayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult') : [];
          
          // 確定済みステータスの希望・募集を除外
          const { filteredRequests: dayRequests, filteredPostings: dayPostings } = filterConfirmedRequestsAndPostings(
            allDayRequests, 
            allDayPostings
          );
          
          // 要相談のリクエストを取得（安全な配列チェック）
          const dayConsultRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult') : [];
          
          // マッチング状況を計算（詳細画面と同じ方式）
          const calculateMatchingStatus = () => {
            // その日の確定シフト数を取得
            const dayAssignedShifts = Array.isArray(assigned) ? assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed') : [];
            const confirmedCount = safeLength(dayAssignedShifts);
            
            // その日のpendingマッチング結果を取得（詳細画面と同じ方式）
            const dayPendingShifts = Array.isArray(assigned) ? assigned.filter((s: any) => s.date === dateStr && s.status === 'pending') : [];
            const unconfirmedMatches = safeLength(dayPendingShifts);
            
            // 確定シフトとpendingマッチング結果の合計
            const totalMatched = confirmedCount + unconfirmedMatches;
            
            // 不足数の計算（詳細画面と同じロジック）
            let totalShortage = 0;
            if (safeLength(dayPostings) > 0) {
              const totalRequired = dayPostings.reduce((sum, p) => sum + (Number(p.required_staff) || 0), 0);
              totalShortage = Math.max(0, totalRequired - totalMatched);
            }
            
            console.log(`カレンダー表示用マッチング結果 [${dateStr}]: 確定=${confirmedCount}, マッチ=${unconfirmedMatches}, 合計=${totalMatched}, 不足=${totalShortage}`);

            return {
              type: totalMatched > 0 ? 'matched' : (totalShortage > 0 || safeLength(dayRequests) > 0 ? 'pending' : 'empty'),
              count: totalMatched,
              shortage: totalShortage,
              unconfirmedMatches: unconfirmedMatches
            };
          };
          
          const matchingStatus = calculateMatchingStatus();
          
          return (
            <div 
              key={i} 
              className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                d ? 'cursor-pointer' : 'bg-gray-50'
              } ${
                selectedDate === dateStr ? 'bg-blue-100 border-blue-300' : ''
              }`}
              onClick={() => d && onDateSelect(dateStr)}
            >
              {d && (
                <>
                  <div className="font-medium">{d}</div>
                  
                  {/* マッチング状況表示 */}
                  {matchingStatus.type === 'confirmed' && (
                    <div className="relative group">
                      <div className="text-[7px] sm:text-[8px] space-y-0.5">
                        <div className="text-green-700 bg-green-50 border border-green-200 rounded px-1 inline-block">
                          <span className="sm:hidden">確{matchingStatus.count}</span>
                          <span className="hidden sm:inline">確定 {matchingStatus.count}件</span>
                        </div>
                        
                        {/* 未確定マッチを表示 */}
                        {matchingStatus.unconfirmedMatches > 0 && (
                            <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                            <span className="sm:hidden">マ{matchingStatus.unconfirmedMatches}</span>
                            <span className="hidden sm:inline">マッチ {matchingStatus.unconfirmedMatches}</span>
                            </div>
                        )}
                        
                        {/* 確定後も不足パッチを表示（AI機能は無効化） */}
                        {matchingStatus.shortage > 0 && (
                          <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                            <span className="sm:hidden">不{matchingStatus.shortage}</span>
                            <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                          </div>
                        )}
                        
                        {safeLength(dayConsultRequests) > 0 && (
                          <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                            <span className="sm:hidden">相{safeLength(dayConsultRequests)}</span>
                            <span className="hidden sm:inline">相談 {safeLength(dayConsultRequests)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* マッチング状況表示（確定シフトがない場合） */}
                  {matchingStatus.type !== 'confirmed' && matchingStatus.type !== 'empty' && (
                    <div className="relative group">
                      <div className="text-[7px] sm:text-[8px] space-y-0.5">
                        {/* マッチ件数（マッチング分析結果に基づく） */}
                        {matchingStatus.count > 0 && (
                          <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                            <span className="sm:hidden">マ{matchingStatus.count}</span>
                            <span className="hidden sm:inline">マッチ {matchingStatus.count}</span>
                          </div>
                        )}
                        
                        {/* 不足件数（マッチング分析結果に基づく） */}
                        {matchingStatus.shortage > 0 && (
                          <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                            <span className="sm:hidden">不{matchingStatus.shortage}</span>
                            <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCalendar;