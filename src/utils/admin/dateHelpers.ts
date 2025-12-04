/**
 * 日付操作のユーティリティ関数
 * AdminDashboardから抽出
 */

/**
 * 指定された月のカレンダー表示用の日付配列を取得
 * 月の最初の曜日に合わせてnullでパディング
 * @param date - 対象月の日付
 * @returns 日付の配列（先頭にnullパディング）
 */
export const getDaysInMonth = (date: Date): (number | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days: (number | null)[] = [];
  // 月の最初の曜日までnullでパディング
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  // 1日から月末まで追加
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

/**
 * 日本語形式の月名を取得
 * @param date - 対象の日付
 * @returns "YYYY年MM月" 形式の文字列
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
};

/**
 * YYYY-MM-DD形式の日付文字列を生成
 * @param year - 年
 * @param month - 月（1-12）
 * @param day - 日（1-31）
 * @returns YYYY-MM-DD形式の文字列
 */
export const formatDateString = (year: number, month: number, day: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

/**
 * 日付文字列をDateオブジェクトに変換
 * @param dateStr - YYYY-MM-DD形式の日付文字列
 * @returns Dateオブジェクト
 */
export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 * @returns 今日の日付文字列
 */
export const getTodayString = (): string => {
  const today = new Date();
  return formatDateString(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
};
