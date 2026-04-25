/**
 * matchingScoreConfigService.ts
 * マッチングスコア設定をDBから取得するサービス
 */

import { supabase } from '../../lib/supabase';

export interface MatchingScoreWeights {
  weight_rating: number;
  weight_distance: number;
  weight_request_count: number;
  weight_acceptance_rate: number;
  request_count_order: 'asc' | 'desc';
}

const DEFAULT_WEIGHTS: MatchingScoreWeights = {
  weight_rating: 0.30,
  weight_distance: 0.30,
  weight_request_count: 0.20,
  weight_acceptance_rate: 0.20,
  request_count_order: 'desc',
};

// キャッシュ（頻繁なDB呼び出しを防止）
let cachedWeights: MatchingScoreWeights | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1分間キャッシュ

/**
 * アクティブなスコア設定をDBから取得（キャッシュ付き）
 */
export const getMatchingScoreWeights = async (): Promise<MatchingScoreWeights> => {
  const now = Date.now();

  // キャッシュが有効ならそれを返す
  if (cachedWeights && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedWeights;
  }

  try {
    const { data, error } = await supabase
      .from('matching_score_config')
      .select('weight_rating, weight_distance, weight_request_count, weight_acceptance_rate, request_count_order')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('スコア設定取得失敗、デフォルト値を使用:', error?.message);
      cachedWeights = DEFAULT_WEIGHTS;
    } else {
      cachedWeights = {
        weight_rating: Number(data.weight_rating),
        weight_distance: Number(data.weight_distance),
        weight_request_count: Number(data.weight_request_count),
        weight_acceptance_rate: Number(data.weight_acceptance_rate),
        request_count_order: data.request_count_order as 'asc' | 'desc',
      };
    }

    cacheTimestamp = now;
    return cachedWeights;
  } catch (err) {
    console.error('スコア設定取得エラー:', err);
    return DEFAULT_WEIGHTS;
  }
};

/**
 * キャッシュを無効化（設定変更後に呼び出し）
 */
export const invalidateScoreConfigCache = () => {
  cachedWeights = null;
  cacheTimestamp = 0;
};
