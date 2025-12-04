/**
 * CalendarGrid.tsx
 * カレンダーの7x7グリッド表示（曜日ヘッダー + 日付セル）
 */

import React from 'react';
import { DateCell } from './DateCell';
import { getDaysInMonth } from '../../../utils/admin/dateHelpers';
import { safeLength } from '../../../utils/admin/arrayHelpers';
import { filterConfirmedRequestsAndPostings } from '../../../services/admin/MatchingService';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: string;
  requests: any[];
  postings: any[];
  assigned: any[];
  onDateSelect: (date: number) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDate,
  requests,
  postings,
  assigned,
  onDateSelect
}) => {
  return (
    <>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['日', '月', '火', '水', '木', '金', '土'].map(d => (
          <div key={d} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {getDaysInMonth(currentDate).map((d, i) => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const dateStr = d
            ? `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
            : '';

          // 空白セルの場合
          if (d === null) {
            return (
              <DateCell
                key={i}
                date={null}
                dateStr=""
                isSelected={false}
                confirmedCount={0}
                matchedCount={0}
                shortage={0}
                consultCount={0}
                onSelect={() => {}}
              />
            );
          }

          // その日の確定シフトを取得
          const dayAssignedShifts = Array.isArray(assigned)
            ? assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed')
            : [];

          // その日の希望と募集を取得
          const allDayRequests = Array.isArray(requests)
            ? requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult')
            : [];
          const allDayPostings = Array.isArray(postings)
            ? postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult')
            : [];

          // 確定済みステータスの希望・募集を除外
          const { filteredRequests: dayRequests, filteredPostings: dayPostings } =
            filterConfirmedRequestsAndPostings(allDayRequests, allDayPostings);

          // 要相談のリクエストを取得
          const dayConsultRequests = Array.isArray(requests)
            ? requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult')
            : [];

          // マッチング状況を計算
          const confirmedCount = safeLength(dayAssignedShifts);

          // pendingマッチング結果を取得
          const dayPendingShifts = Array.isArray(assigned)
            ? assigned.filter((s: any) => s.date === dateStr && s.status === 'pending')
            : [];
          const unconfirmedMatches = safeLength(dayPendingShifts);

          // 確定シフトとpendingマッチング結果の合計
          const totalMatched = confirmedCount + unconfirmedMatches;

          // 不足数の計算
          let totalShortage = 0;
          if (safeLength(dayPostings) > 0) {
            const totalRequired = dayPostings.reduce((sum, p) => sum + (Number(p.required_staff) || 0), 0);
            totalShortage = Math.max(0, totalRequired - totalMatched);
          }

          return (
            <DateCell
              key={i}
              date={d}
              dateStr={dateStr}
              isSelected={selectedDate === dateStr}
              confirmedCount={confirmedCount}
              matchedCount={unconfirmedMatches}
              shortage={totalShortage}
              consultCount={safeLength(dayConsultRequests)}
              onSelect={onDateSelect}
            />
          );
        })}
      </div>
    </>
  );
};
