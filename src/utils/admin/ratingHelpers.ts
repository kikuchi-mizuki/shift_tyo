/**
 * 評価関連のユーティリティ関数
 * AdminDashboardから抽出
 */

import { safeLength } from './arrayHelpers';

/**
 * 薬剤師評価の型定義
 */
export interface PharmacistRating {
  id: string;
  pharmacist_id: string;
  pharmacy_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

/**
 * 薬剤師の平均評価を計算
 * @param pharmacistId - 薬剤師ID
 * @param ratings - 全評価データ
 * @returns 平均評価（小数点第1位まで、評価がない場合は0）
 */
export const getPharmacistRating = (
  pharmacistId: string,
  ratings: PharmacistRating[]
): number => {
  const pharmacistRatings = Array.isArray(ratings)
    ? ratings.filter(r => r.pharmacist_id === pharmacistId)
    : [];

  if (safeLength(pharmacistRatings) === 0) return 0;

  const average =
    pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) /
    safeLength(pharmacistRatings);

  return Math.round(average * 10) / 10; // 小数点第1位まで
};

/**
 * 評価を星の数に変換（1-5）
 * @param rating - 評価値
 * @returns 星の数（1-5の整数）
 */
export const getRatingStars = (rating: number): number => {
  return Math.round(rating);
};

/**
 * 評価のテキスト表現を取得
 * @param rating - 評価値
 * @returns 評価のテキスト
 */
export const getRatingText = (rating: number): string => {
  if (rating === 0) return '未評価';
  if (rating >= 4.5) return '優秀';
  if (rating >= 4.0) return '良好';
  if (rating >= 3.5) return '普通';
  if (rating >= 3.0) return 'やや低い';
  return '要改善';
};

/**
 * 評価数を取得
 * @param pharmacistId - 薬剤師ID
 * @param ratings - 全評価データ
 * @returns 評価の数
 */
export const getRatingCount = (
  pharmacistId: string,
  ratings: PharmacistRating[]
): number => {
  const pharmacistRatings = Array.isArray(ratings)
    ? ratings.filter(r => r.pharmacist_id === pharmacistId)
    : [];

  return safeLength(pharmacistRatings);
};
