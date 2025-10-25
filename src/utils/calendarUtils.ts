/**
 * カレンダー関連の共通ユーティリティ関数
 * 重複コードを統一するための共通関数
 */

/**
 * 月名を取得
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
};

/**
 * 月の日数を取得（カレンダー表示用）
 * 空のセル（月の最初の日より前の曜日分）も含む
 */
export const getDaysInMonth = (date: Date): (number | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay(); // 0=日曜日, 1=月曜日, ...
  
  const days = [];
  
  // 月の最初の日より前の空のセルを追加
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // 月の日付を追加
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return days;
};

/**
 * 日付文字列を生成
 */
export const formatDateString = (date: Date, day: number): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * 月の前後移動
 */
export const getPreviousMonth = (currentDate: Date): Date => {
  const newDate = new Date(currentDate);
  newDate.setMonth(newDate.getMonth() - 1);
  return newDate;
};

export const getNextMonth = (currentDate: Date): Date => {
  const newDate = new Date(currentDate);
  newDate.setMonth(newDate.getMonth() + 1);
  return newDate;
};

/**
 * 安全な配列長取得
 */
export const safeLength = (arr: any): number => {
  return Array.isArray(arr) ? arr.length : 0;
};

/**
 * 時間を分単位に変換
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 基本的な時間適合性チェック
 */
export const isTimeCompatible = (request: any, posting: any): boolean => {
  const requestStart = timeToMinutes(request.start_time);
  const requestEnd = timeToMinutes(request.end_time);
  const postingStart = timeToMinutes(posting.start_time);
  const postingEnd = timeToMinutes(posting.end_time);
  
  // 薬剤師が薬局の希望時間を完全にカバーしているかチェック
  return requestStart <= postingStart && requestEnd >= postingEnd;
};
