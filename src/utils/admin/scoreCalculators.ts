/**
 * スコア計算のユーティリティ関数
 * AdminDashboardから抽出
 */

/**
 * ユーザープロフィールの基本型
 */
export interface UserProfile {
  id: string;
  name: string;
  address?: string;
  nearest_station_name?: string;
  location_latitude?: number;
  location_longitude?: number;
  [key: string]: any;
}

/**
 * シフトリクエストの基本型
 */
export interface ShiftRequest {
  id: string;
  pharmacist_id: string;
  date: string;
  [key: string]: any;
}

/**
 * 薬剤師と薬局間の距離スコアを計算（簡易実装）
 * @param pharmacist - 薬剤師プロフィール
 * @param pharmacy - 薬局プロフィール
 * @returns 距離スコア（0-1の範囲、高いほど近い）
 */
export const calculateDistanceScore = (
  pharmacist: UserProfile,
  pharmacy: UserProfile
): number => {
  // 住所情報から距離を計算（簡易実装）
  const pharmacistAddress = pharmacist?.address || '';
  const pharmacyAddress = pharmacy?.address || '';

  if (!pharmacistAddress || !pharmacyAddress) {
    // 住所情報がない場合は中程度のスコア
    return 0.5;
  }

  // 簡易的な距離計算（実際の実装では住所から距離を計算）
  // 同じ市区町村なら高スコア、異なる都道府県なら低スコア
  const pharmacistCity = pharmacistAddress.split(' ')[0] || '';
  const pharmacyCity = pharmacyAddress.split(' ')[0] || '';

  if (pharmacistCity === pharmacyCity) {
    return 0.9; // 同じ市区町村
  } else if (
    pharmacistAddress.includes(pharmacyAddress.split(' ')[0]) ||
    pharmacyAddress.includes(pharmacistAddress.split(' ')[0])
  ) {
    return 0.7; // 近い地域
  } else {
    return 0.3; // 遠い地域
  }
};

/**
 * 薬剤師のシフトリクエスト回数に基づくスコアを計算
 * @param pharmacistId - 薬剤師ID
 * @param shiftRequests - 全シフトリクエスト
 * @returns リクエスト数スコア（0-1の範囲、多いほど高い）
 */
export const calculateRequestCountScore = (
  pharmacistId: string,
  shiftRequests: ShiftRequest[]
): number => {
  const requestCount = Array.isArray(shiftRequests)
    ? shiftRequests.filter(r => r.pharmacist_id === pharmacistId).length
    : 0;
  // 希望回数に基づくスコア（0-1の範囲）
  return Math.min(requestCount / 10, 1); // 10回以上は1.0
};

/**
 * 経験年数に基づくスコアを計算
 * @param experience - 経験年数
 * @returns 経験スコア（0-1の範囲）
 */
export const calculateExperienceScore = (experience: number): number => {
  if (experience >= 10) return 1.0;
  if (experience >= 5) return 0.8;
  if (experience >= 3) return 0.6;
  if (experience >= 1) return 0.4;
  return 0.2;
};

/**
 * 総合マッチングスコアを計算
 * @param params - スコア計算パラメータ
 * @returns 総合スコア（0-1の範囲）
 */
export const calculateMatchingScore = (params: {
  distanceScore: number;
  ratingScore: number;
  experienceScore: number;
  requestCountScore: number;
  weights?: {
    distance?: number;
    rating?: number;
    experience?: number;
    requestCount?: number;
  };
}): number => {
  const {
    distanceScore,
    ratingScore,
    experienceScore,
    requestCountScore,
    weights = {}
  } = params;

  // デフォルトの重み
  const defaultWeights = {
    distance: 0.4,
    rating: 0.3,
    experience: 0.2,
    requestCount: 0.1
  };

  const finalWeights = { ...defaultWeights, ...weights };

  return (
    distanceScore * finalWeights.distance +
    ratingScore * finalWeights.rating +
    experienceScore * finalWeights.experience +
    requestCountScore * finalWeights.requestCount
  );
};
