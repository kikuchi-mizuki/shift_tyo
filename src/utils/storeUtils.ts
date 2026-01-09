/**
 * storeUtils.ts
 * 店舗名取得関連のユーティリティ関数
 */

/**
 * シフトオブジェクトから店舗名を取得
 * 優先順位:
 * 1. store_name フィールド（直接指定）
 * 2. memo から [store:店舗名] 形式で抽出
 * 3. フォールバック値（薬局名など）
 *
 * @param shift - シフトまたは投稿オブジェクト
 * @param fallbackName - 店舗名が取得できない場合のフォールバック値
 * @returns 店舗名（フォールバック含む）
 */
export const extractStoreName = (
  shift: {
    store_name?: string | null;
    memo?: string | null;
  },
  fallbackName: string = ''
): string => {
  // 1. store_nameフィールドを優先
  const directStoreName = (shift.store_name || '').trim();
  if (directStoreName) {
    return directStoreName;
  }

  // 2. memoから [store:店舗名] 形式で抽出
  if (shift.memo && typeof shift.memo === 'string') {
    const match = shift.memo.match(/\[store:([^\]]+)\]/);
    if (match && match[1]) {
      const extractedName = match[1].trim();
      if (extractedName) {
        return extractedName;
      }
    }
  }

  // 3. フォールバック値を返す
  return fallbackName;
};

/**
 * 時間表示用の文字列を生成
 * start_time/end_timeを優先し、なければtime_slotから推測
 *
 * @param shift - シフトオブジェクト
 * @returns 時間帯の表示文字列（例: "09:00-13:00"）
 */
export const getTimeDisplay = (shift: {
  start_time?: string | null;
  end_time?: string | null;
  time_slot?: string | null;
}): string => {
  // start_time/end_timeが両方ある場合はそれを使用
  if (shift.start_time && shift.end_time) {
    const start = String(shift.start_time).substring(0, 5);
    const end = String(shift.end_time).substring(0, 5);
    return `${start}-${end}`;
  }

  // time_slotから推測（後方互換性のため）
  const timeSlot = shift.time_slot;
  if (timeSlot === 'morning' || timeSlot === 'am') {
    return '09:00-13:00';
  }
  if (timeSlot === 'afternoon' || timeSlot === 'pm') {
    return '13:00-18:00';
  }
  if (timeSlot === 'full' || timeSlot === 'fullday') {
    return '09:00-18:00';
  }
  if (timeSlot === 'consult' || timeSlot === 'negotiable') {
    return '要相談';
  }

  return '時間未設定';
};

/**
 * 時間帯の値を正規化
 * 異なる表記を標準形式に統一
 *
 * @param timeSlot - 正規化前のtime_slot値
 * @returns 正規化後のtime_slot値
 */
export const normalizeTimeSlot = (timeSlot: string | null | undefined): string => {
  if (!timeSlot) {
    return 'fullday';
  }

  // 標準形式への変換
  const normalized = timeSlot.toLowerCase().trim();

  switch (normalized) {
    case 'am':
      return 'morning';
    case 'pm':
      return 'afternoon';
    case 'full':
    case 'custom':
      return 'fullday';
    case 'consult':
      return 'negotiable';
    default:
      return normalized;
  }
};

/**
 * 時刻文字列をHH:MM:SS形式に変換
 *
 * @param time - 時刻文字列（HH:MM または HH:MM:SS）
 * @returns HH:MM:SS形式の文字列、または元の値
 */
export const toHHMMSS = (time: string | null | undefined): string | undefined => {
  if (!time) return undefined;

  const timeStr = String(time).trim();

  // すでにHH:MM:SS形式の場合はそのまま返す
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }

  // HH:MM形式の場合は:00を追加
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return `${timeStr}:00`;
  }

  // その他の形式はそのまま返す（エラーハンドリングは呼び出し側で）
  return timeStr;
};
