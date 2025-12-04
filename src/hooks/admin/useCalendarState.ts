/**
 * useCalendarState.ts
 * カレンダー状態管理を行うカスタムフック
 */

import { useState, useCallback } from 'react';

interface UseCalendarStateReturn {
  currentDate: Date;
  selectedDate: string;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: string) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleDateSelect: (date: string) => void;
}

export const useCalendarState = (): UseCalendarStateReturn => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');

  /**
   * 前月に移動
   */
  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  /**
   * 次月に移動
   */
  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  /**
   * 日付を選択
   */
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  return {
    currentDate,
    selectedDate,
    setCurrentDate,
    setSelectedDate,
    handlePrevMonth,
    handleNextMonth,
    handleDateSelect
  };
};
