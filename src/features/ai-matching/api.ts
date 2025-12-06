/**
 * AI Matching API
 * AIマッチングシステム用のAPIエンドポイント
 */

import { supabase } from '../../lib/supabase';
import { generateDistanceBasedMatches } from './distanceMatching';
import { executeHistoryBasedMatching } from './pharmacistHistoryMatching';

export interface AIMatchingRequest {
  date: string;
  requests: any[];
  postings: any[];
  userProfiles?: any;
  options?: {
    useAI?: boolean;
    algorithm?: 'rule_based' | 'ai_based' | 'hybrid';
    priority?: 'satisfaction' | 'efficiency' | 'balance';
  };
}

export interface AIMatchingResponse {
  success: boolean;
  matches: any[];
  statistics: {
    totalRequests: number;
    totalPostings: number;
    matchedCount: number;
    successRate: number;
    averageCompatibilityScore: number;
    executionTimeMs: number;
  };
  metadata: {
    algorithm: string;
    version: string;
    timestamp: string;
  };
}

/**
 * AIマッチングの実行
 */
export const executeAIMatching = async (request: AIMatchingRequest): Promise<AIMatchingResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('AI Matching API called:', request);
    console.log('Requests data:', request.requests);
    console.log('Postings data:', request.postings);
    
    // 基本的なバリデーション
    if (!request.date || !request.requests || !request.postings) {
      throw new Error('Invalid request parameters');
    }
    
    // データの存在確認
    if (request.requests.length === 0) {
      console.warn('No shift requests found');
    }
    if (request.postings.length === 0) {
      console.warn('No shift postings found');
    }

    // マッチングアルゴリズムの選択
    const algorithm = request.options?.algorithm || 'hybrid';
    const useAI = request.options?.useAI ?? true;

    let matches: any[] = [];
    let successRate = 0;
    let averageCompatibilityScore = 0;

    if (algorithm === 'rule_based') {
      // ルールベースマッチング
      matches = await executeRuleBasedMatching(request.requests, request.postings, request.userProfiles);
      successRate = 0.8; // ルールベースの成功率
      averageCompatibilityScore = 0.7;
    } else if (algorithm === 'ai_based' && useAI) {
      // AIベースマッチング
      matches = await executeAIBasedMatching(request.requests, request.postings, request.userProfiles);
      successRate = 0.9; // AIベースの成功率
      averageCompatibilityScore = 0.85;
    } else {
      // ハイブリッドマッチング（距離ベースを含む）
      matches = await executeHybridMatching(request.requests, request.postings, request.userProfiles);
      successRate = 0.85;
      averageCompatibilityScore = 0.8;
    }

    const executionTime = Date.now() - startTime;

    // マッチング履歴を保存
    await saveMatchingHistory({
      date: request.date,
      matchingType: algorithm,
      totalRequests: request.requests.length,
      totalPostings: request.postings.length,
      matchedCount: matches.length,
      successRate,
      averageCompatibilityScore,
      executionTimeMs: executionTime,
      metadata: {
        algorithm_version: '1.0',
        options: request.options
      }
    });

    return {
      success: true,
      matches,
      statistics: {
        totalRequests: request.requests.length,
        totalPostings: request.postings.length,
        matchedCount: matches.length,
        successRate,
        averageCompatibilityScore,
        executionTimeMs: executionTime
      },
      metadata: {
        algorithm,
        version: '1.0',
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('AI Matching API error:', error);
    
    return {
      success: false,
      matches: [],
      statistics: {
        totalRequests: request.requests.length,
        totalPostings: request.postings.length,
        matchedCount: 0,
        successRate: 0,
        averageCompatibilityScore: 0,
        executionTimeMs: Date.now() - startTime
      },
      metadata: {
        algorithm: request.options?.algorithm || 'hybrid',
        version: '1.0',
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * ルールベースマッチング
 */
const executeRuleBasedMatching = async (requests: any[], postings: any[], userProfiles?: any): Promise<any[]> => {
  console.log('=== executeRuleBasedMatching START ===');
  console.log('Requests count:', requests.length);
  console.log('Postings count:', postings.length);
  console.log('Sample request:', requests[0]);
  console.log('Sample posting:', postings[0]);
  
  const matches: any[] = [];
  const usedPharmacists = new Set<string>();
  const pharmacyUsageCount = new Map<string, number>(); // 薬局・店舗ごとの使用数を追跡

  // 薬剤師を評価順にソート
  const sortedRequests = requests.sort((a, b) => {
    const aRating = getPharmacistRating(a.pharmacist_id);
    const bRating = getPharmacistRating(b.pharmacist_id);
    return bRating - aRating;
  });

  for (const request of sortedRequests) {
    for (const posting of postings) {
      const isCompatible = isBasicCompatible(request, posting);
      const uniqueKey = `${posting.pharmacy_id}_${posting.store_name || 'default'}`;
      const currentUsage = pharmacyUsageCount.get(uniqueKey) || 0;
      const requiredStaff = posting.required_staff || 1;
      
      console.log(`Checking compatibility:`, {
        request_id: request.id,
        posting_id: posting.id,
        pharmacist_time: `${request.start_time}-${request.end_time}`,
        pharmacy_time: `${posting.start_time}-${posting.end_time}`,
        isCompatible,
        uniqueKey,
        currentUsage,
        requiredStaff,
        logic: `pharmacist_start(${request.start_time}) <= pharmacy_start(${posting.start_time}) && pharmacist_end(${request.end_time}) >= pharmacy_end(${posting.end_time})`
      });
      
      if (
        !usedPharmacists.has(request.pharmacist_id) &&
        currentUsage < requiredStaff &&
        isCompatible
      ) {
        // user_profilesから店舗名を取得（薬局名をフォールバックとして使わない）
        const storeName = userProfiles?.[posting.pharmacy_id]?.store_name || posting.store_name || '店舗名未設定';

        matches.push({
          pharmacist_id: request.pharmacist_id,
          pharmacy_id: posting.pharmacy_id,
          date: posting.date,
          time_slot: posting.time_slot, // time_slotを追加
          start_time: posting.start_time,
          end_time: posting.end_time,
          status: 'confirmed',
          store_name: storeName,
          memo: 'Rule-based matching',
          compatibility_score: 0.7
        });

        usedPharmacists.add(request.pharmacist_id);
        pharmacyUsageCount.set(uniqueKey, currentUsage + 1);
        break;
      }
    }
  }

  console.log('=== executeRuleBasedMatching END ===');
  console.log('Final matches count:', matches.length);
  return matches;
};

/**
 * AIベースマッチング
 */
const executeAIBasedMatching = async (requests: any[], postings: any[], userProfiles?: any): Promise<any[]> => {
  const matches: any[] = [];
  const usedPharmacists = new Set<string>();
  const pharmacyUsageCount = new Map<string, number>(); // 薬局・店舗ごとの使用数を追跡

  // AIスコアリング（簡易版）
  const scoredMatches: Array<{ match: any; score: number }> = [];

  for (const request of requests) {
    for (const posting of postings) {
      if (isBasicCompatible(request, posting)) {
        const score = await calculateAIScore(request, posting);
        // user_profilesから店舗名を取得（薬局名をフォールバックとして使わない）
        const storeName = userProfiles?.[posting.pharmacy_id]?.store_name || posting.store_name || '店舗名未設定';

        scoredMatches.push({
          match: {
            pharmacist_id: request.pharmacist_id,
            pharmacy_id: posting.pharmacy_id,
            date: posting.date,
            time_slot: posting.time_slot, // time_slotを追加
            start_time: posting.start_time,
            end_time: posting.end_time,
            status: 'confirmed',
            store_name: storeName,
            memo: `AI Matching: ${score.toFixed(2)} score`,
            compatibility_score: score
          },
          score
        });
      }
    }
  }

  // スコア順にソート
  scoredMatches.sort((a, b) => b.score - a.score);

  // 最適な組み合わせを選択
  for (const { match } of scoredMatches) {
    const uniqueKey = `${match.pharmacy_id}_${match.store_name || 'default'}`;
    const currentUsage = pharmacyUsageCount.get(uniqueKey) || 0;
    const requiredStaff = postings.find(p => p.pharmacy_id === match.pharmacy_id && p.store_name === match.store_name)?.required_staff || 1;
    
    if (
      !usedPharmacists.has(match.pharmacist_id) &&
      currentUsage < requiredStaff &&
      match.compatibility_score > 0.3
    ) {
      matches.push(match);
      usedPharmacists.add(match.pharmacist_id);
      pharmacyUsageCount.set(uniqueKey, currentUsage + 1);
    }
  }

  return matches;
};

/**
 * ハイブリッドマッチング
 */
const executeHybridMatching = async (requests: any[], postings: any[], userProfiles?: any): Promise<any[]> => {
  // ルールベースで候補を絞り込み
  const ruleBasedMatches = await executeRuleBasedMatching(requests, postings, userProfiles);

  // AIでスコアリング
  const aiScoredMatches = await executeAIBasedMatching(requests, postings, userProfiles);
  
  // 距離ベースのマッチング
  let distanceBasedMatches: any[] = [];
  if (userProfiles) {
    try {
      distanceBasedMatches = await generateDistanceBasedMatches(requests, postings, userProfiles);
      console.log(`Distance-based matches: ${distanceBasedMatches.length}`);
    } catch (error) {
      console.warn('Distance-based matching failed:', error);
    }
  }
  
  // 履歴ベースのマッチング（薬剤師の希望回数を考慮）
  let historyBasedMatches: any[] = [];
  try {
    historyBasedMatches = await executeHistoryBasedMatching(requests, postings, userProfiles);
    console.log(`History-based matches: ${historyBasedMatches.length}`);
  } catch (error) {
    console.warn('History-based matching failed:', error);
  }
  
  // 全ての結果を統合（履歴ベースを最優先、次に距離ベース、AI、最後にルールベース）
  const combinedMatches = [...historyBasedMatches, ...distanceBasedMatches, ...aiScoredMatches, ...ruleBasedMatches];
  
  // 重複を除去（履歴ベースの結果を最優先）
  const uniqueMatches = combinedMatches.filter((match, index, self) => 
    index === self.findIndex(m => 
      m.pharmacist_id === match.pharmacist_id && 
      m.pharmacy_id === match.pharmacy_id
    )
  );

  return uniqueMatches;
};

/**
 * 基本的な互換性チェック
 * 薬剤師が薬局の希望時間を完全に満たしているかチェック
 */
const isBasicCompatible = (request: any, posting: any): boolean => {
  const rs = request?.start_time; // 薬剤師の開始時間
  const re = request?.end_time;   // 薬剤師の終了時間
  const ps = posting?.start_time; // 薬局の希望開始時間
  const pe = posting?.end_time;   // 薬局の希望終了時間

  if (!rs || !re || !ps || !pe) return false;

  // 薬剤師が薬局の希望時間を完全に満たしているかチェック
  // 薬剤師の開始時間 <= 薬局の開始時間 かつ 薬剤師の終了時間 >= 薬局の終了時間
  return rs <= ps && re >= pe;
};

/**
 * AIスコアの計算
 */
const calculateAIScore = async (request: any, posting: any): Promise<number> => {
  let score = 0;

  try {
    // 薬剤師の特徴量を取得
    const pharmacistProfile = await getPharmacistProfile(request.pharmacist_id);
    const pharmacyProfile = await getPharmacyProfile(posting.pharmacy_id);

    if (!pharmacistProfile || !pharmacyProfile) {
      return 0.5; // デフォルトスコア
    }

    // スキルマッチング (30%)
    const skillScore = calculateSkillMatch(
      pharmacistProfile.skills || [],
      pharmacyProfile.required_skills || []
    );
    score += skillScore * 0.3;

    // 経験レベルマッチング (20%)
    const experienceScore = calculateExperienceMatch(
      pharmacistProfile.experience || 0,
      pharmacyProfile.experience_level || 'intermediate'
    );
    score += experienceScore * 0.2;

    // 時間柔軟性 (20%)
    const flexibilityScore = calculateTimeFlexibility(request, posting);
    score += flexibilityScore * 0.2;

    // 過去の実績 (15%)
    const performanceScore = (
      (pharmacistProfile.average_satisfaction || 0) + 
      (pharmacyProfile.average_pharmacist_satisfaction || 0)
    ) / 2;
    score += performanceScore * 0.15;

    // 緊急度対応 (15%)
    const urgencyScore = calculateUrgencyScore(posting);
    score += urgencyScore * 0.15;

    return Math.min(score, 1); // 最大1.0

  } catch (error) {
    console.error('Error calculating AI score:', error);
    return 0.5; // エラー時はデフォルトスコア
  }
};

/**
 * 薬剤師プロファイルの取得
 */
const getPharmacistProfile = async (pharmacistId: string): Promise<any> => {
  try {
    console.log('Fetching pharmacist profile for:', pharmacistId);
    const { data, error } = await supabase
      .from('pharmacist_profiles')
      .select('*')
      .eq('user_id', pharmacistId)
      .single();

    if (error) {
      console.error('Error fetching pharmacist profile:', error);
      // データが見つからない場合はデフォルト値を返す
      return {
        skills: [],
        experience: 2,
        average_satisfaction: 4.0
      };
    }

    console.log('Pharmacist profile found:', data);
    return data;
  } catch (error) {
    console.error('Error in getPharmacistProfile:', error);
    return {
      skills: [],
      experience: 2,
      average_satisfaction: 4.0
    };
  }
};

/**
 * 薬局プロファイルの取得
 */
const getPharmacyProfile = async (pharmacyId: string): Promise<any> => {
  try {
    console.log('Fetching pharmacy profile for:', pharmacyId);
    const { data, error } = await supabase
      .from('pharmacy_profiles')
      .select('*')
      .eq('user_id', pharmacyId)
      .single();

    if (error) {
      console.error('Error fetching pharmacy profile:', error);
      // データが見つからない場合はデフォルト値を返す
      return {
        required_skills: [],
        experience_level: 'intermediate',
        average_pharmacist_satisfaction: 4.0
      };
    }

    console.log('Pharmacy profile found:', data);
    return data;
  } catch (error) {
    console.error('Error in getPharmacyProfile:', error);
    return {
      required_skills: [],
      experience_level: 'intermediate',
      average_pharmacist_satisfaction: 4.0
    };
  }
};

/**
 * スキルマッチングの計算
 */
const calculateSkillMatch = (pharmacistSkills: string[], requiredSkills: string[]): number => {
  if (requiredSkills.length === 0) return 1;
  
  const matchedSkills = requiredSkills.filter(skill => pharmacistSkills.includes(skill));
  return matchedSkills.length / requiredSkills.length;
};

/**
 * 経験レベルマッチングの計算
 */
const calculateExperienceMatch = (experience: number, requiredLevel: string): number => {
  const levelThresholds = {
    junior: 0,
    intermediate: 2,
    senior: 5
  };

  const threshold = levelThresholds[requiredLevel as keyof typeof levelThresholds] || 2;
  if (experience >= threshold) return 1;
  if (experience >= threshold * 0.7) return 0.7;
  return 0.3;
};

/**
 * 時間柔軟性の計算
 */
const calculateTimeFlexibility = (request: any, posting: any): number => {
  const requestDuration = getTimeDuration(request.start_time, request.end_time);
  const postingDuration = getTimeDuration(posting.start_time, posting.end_time);
  
  const flexibility = Math.max(0, requestDuration - postingDuration);
  return Math.min(flexibility / 60, 1); // 最大1時間の柔軟性
};

/**
 * 時間の長さを分単位で取得
 */
const getTimeDuration = (start: string, end: string): number => {
  const startTime = new Date(`2000-01-01T${start}`);
  const endTime = new Date(`2000-01-01T${end}`);
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
};

/**
 * 緊急度スコアの計算
 */
const calculateUrgencyScore = (posting: any): number => {
  const requiredStaff = Number(posting.required_staff) || 0;
  if (requiredStaff >= 3) return 1;
  if (requiredStaff >= 2) return 0.7;
  return 0.5;
};

/**
 * 薬剤師の評価を取得
 */
const getPharmacistRating = (pharmacistId: string): number => {
  // 簡易的な評価取得（実際の実装ではデータベースから取得）
  return Math.random() * 2 + 3; // 3.0-5.0の範囲
};

/**
 * マッチング履歴の保存
 */
const saveMatchingHistory = async (history: any): Promise<void> => {
  try {
    console.log('Saving matching history:', history);
    const { error } = await supabase
      .from('matching_history')
      .insert(history);

    if (error) {
      console.error('Error saving matching history:', error);
    } else {
      console.log('Matching history saved successfully');
    }
  } catch (error) {
    console.error('Error in saveMatchingHistory:', error);
  }
};

/**
 * マッチング結果の記録
 */
export const recordMatchOutcome = async (outcome: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from('match_outcomes')
      .insert({
        pharmacist_id: outcome.pharmacistId,
        pharmacy_id: outcome.pharmacyId,
        date: outcome.date,
        start_time: outcome.startTime,
        end_time: outcome.endTime,
        success: outcome.success,
        satisfaction_score: outcome.satisfactionScore,
        efficiency_score: outcome.efficiencyScore,
        feedback: outcome.feedback,
        completion_time: outcome.completionTime,
        no_show: outcome.noShow,
        early_leave: outcome.earlyLeave,
        additional_notes: outcome.additionalNotes
      });

    if (error) {
      // テーブルが存在しない場合は警告のみ
      if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
        console.warn('match_outcomes table not found, skipping outcome recording');
        return;
      }
      console.error('Error recording match outcome:', error);
    }
  } catch (error) {
    console.error('Error in recordMatchOutcome:', error);
  }
};

/**
 * 学習データの取得
 */
export const getLearningData = async (limit: number = 1000): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // テーブルが存在しない場合は空配列を返す
      if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
        console.warn('learning_data table not found, returning empty array');
        return [];
      }
      console.error('Error fetching learning data:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLearningData:', error);
    return [];
  }
};

/**
 * マッチング統計の取得
 */
export const getMatchingStatistics = async (dateRange?: { start: string; end: string }): Promise<any> => {
  try {
    console.log('Fetching matching statistics with dateRange:', dateRange);
    let query = supabase
      .from('matching_history')
      .select('*')
      .order('date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching matching statistics:', error);
      return {
        totalMatches: 0,
        averageSuccessRate: 0,
        averageExecutionTime: 0,
        algorithmPerformance: {}
      };
    }

    if (!data || data.length === 0) {
      return {
        totalMatches: 0,
        averageSuccessRate: 0,
        averageExecutionTime: 0,
        algorithmPerformance: {}
      };
    }

    // 統計の計算
    const totalMatches = data.reduce((sum, record) => sum + record.matched_count, 0);
    const averageSuccessRate = data.reduce((sum, record) => sum + record.success_rate, 0) / data.length;
    const averageExecutionTime = data.reduce((sum, record) => sum + record.execution_time_ms, 0) / data.length;

    // アルゴリズム別の性能
    const algorithmPerformance = data.reduce((acc, record) => {
      const type = record.matching_type;
      if (!acc[type]) {
        acc[type] = { count: 0, totalSuccessRate: 0, totalExecutionTime: 0 };
      }
      acc[type].count++;
      acc[type].totalSuccessRate += record.success_rate;
      acc[type].totalExecutionTime += record.execution_time_ms;
      return acc;
    }, {} as any);

    // 平均値を計算
    Object.keys(algorithmPerformance).forEach(type => {
      const perf = algorithmPerformance[type];
      perf.averageSuccessRate = perf.totalSuccessRate / perf.count;
      perf.averageExecutionTime = perf.totalExecutionTime / perf.count;
    });

    return {
      totalMatches,
      averageSuccessRate,
      averageExecutionTime,
      algorithmPerformance,
      recentHistory: data.slice(0, 10)
    };

  } catch (error) {
    console.error('Error in getMatchingStatistics:', error);
    return null;
  }
};

export default {
  executeAIMatching,
  recordMatchOutcome,
  getLearningData,
  getMatchingStatistics
};
