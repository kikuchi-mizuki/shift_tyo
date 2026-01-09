/**
 * validation.ts
 * 入力バリデーション関連のユーティリティ関数
 */

/**
 * 日付文字列がYYYY-MM-DD形式かチェック
 * @param dateStr - チェックする日付文字列
 * @returns バリデーション結果
 */
export const isValidDateFormat = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // YYYY-MM-DD形式の正規表現
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  // 実際に有効な日付かチェック
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return false;
  }

  // ISO形式で再変換して一致するかチェック（2月30日などの無効な日付を検出）
  const isoDate = date.toISOString().split('T')[0];
  return isoDate === dateStr;
};

/**
 * 時刻文字列がHH:MM形式かチェック
 * @param timeStr - チェックする時刻文字列
 * @returns バリデーション結果
 */
export const isValidTimeFormat = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') {
    return false;
  }

  // HH:MM形式の正規表現
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
};

/**
 * 店舗名の長さと内容をバリデーション
 * @param storeName - チェックする店舗名
 * @param maxLength - 最大文字数（デフォルト: 100）
 * @returns バリデーション結果
 */
export const isValidStoreName = (storeName: string, maxLength: number = 100): boolean => {
  if (typeof storeName !== 'string') {
    return false;
  }

  const trimmed = storeName.trim();

  // 空文字列はOK（店舗名なしの場合もある）
  if (trimmed === '') {
    return true;
  }

  // 長さチェック
  if (trimmed.length > maxLength) {
    return false;
  }

  // 制御文字が含まれていないかチェック
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\x00-\x1F\x7F]/;
  if (controlCharRegex.test(trimmed)) {
    return false;
  }

  return true;
};

/**
 * メールアドレスの形式をバリデーション
 * @param email - チェックするメールアドレス
 * @returns バリデーション結果
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // 基本的なメールアドレス形式のチェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 開始時間が終了時間より前かチェック
 * @param startTime - 開始時間（HH:MM形式）
 * @param endTime - 終了時間（HH:MM形式）
 * @returns バリデーション結果
 */
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }

  return startTime < endTime;
};

/**
 * 文字列の長さをバリデーション
 * @param str - チェックする文字列
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @returns バリデーション結果
 */
export const isValidLength = (
  str: string,
  minLength: number = 0,
  maxLength: number = Infinity
): boolean => {
  if (typeof str !== 'string') {
    return false;
  }

  const length = str.trim().length;
  return length >= minLength && length <= maxLength;
};

/**
 * 必要人数のバリデーション
 * @param count - チェックする人数
 * @param min - 最小人数（デフォルト: 1）
 * @param max - 最大人数（デフォルト: 10）
 * @returns バリデーション結果
 */
export const isValidStaffCount = (count: number, min: number = 1, max: number = 10): boolean => {
  if (typeof count !== 'number' || isNaN(count)) {
    return false;
  }

  return Number.isInteger(count) && count >= min && count <= max;
};
