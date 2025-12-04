/**
 * 配列操作のユーティリティ関数
 * AdminDashboardから抽出
 */

/**
 * 安全な配列アクセスのためのヘルパー関数
 * null, undefined, 非配列を空配列に変換
 * @param arr - チェック対象の値
 * @returns 安全な配列
 */
export const safeArray = <T = any>(arr: any): T[] => {
  if (arr === null || arr === undefined) return [];
  if (Array.isArray(arr)) return arr;
  if (typeof arr === 'object' && arr.length !== undefined) return Array.from(arr);
  return [];
};

/**
 * 安全な配列長取得
 * @param arr - チェック対象の値
 * @returns 配列の長さ（非配列の場合は0）
 */
export const safeLength = (arr: any): number => {
  const safe = safeArray(arr);
  return safe.length;
};

/**
 * 安全なオブジェクトアクセスのためのヘルパー関数
 * null, undefined, 非オブジェクトを空オブジェクトに変換
 * @param obj - チェック対象の値
 * @returns 安全なオブジェクト
 */
export const safeObject = <T = Record<string, any>>(obj: any): T => {
  if (obj === null || obj === undefined) return {} as T;
  if (typeof obj === 'object' && !Array.isArray(obj)) return obj;
  return {} as T;
};
