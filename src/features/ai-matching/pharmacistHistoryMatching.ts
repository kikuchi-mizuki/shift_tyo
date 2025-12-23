/**
 * 薬剤師の過去のシフト希望回数を考慮したマッチング機能
 * 要件3: 薬剤師の今までのシフト希望回数を優先順位に含める
 */

import { supabase } from '../../lib/supabase';

export interface PharmacistHistory {
  pharmacist_id: string;
  total_requests: number;
  successful_matches: number;
  success_rate: number;
  recent_activity: number; // 直近30日間の希望回数
  priority_score: number; // 総合優先度スコア
}

/**
 * 薬剤師の過去のシフト希望履歴を取得
 */
export const getPharmacistHistory = async (pharmacistIds: string[]): Promise<Map<string, PharmacistHistory>> => {
  const historyMap = new Map<string, PharmacistHistory>();
  
  try {
    for (const pharmacistId of pharmacistIds) {
      // 過去のシフトリクエスト数を取得
      const { data: requests, error: requestsError } = await supabase
        .from('shift_requests')
        .select('id, created_at')
        .eq('pharmacist_id', pharmacistId);
      
      if (requestsError) {
        console.error('Error fetching shift requests:', requestsError);
        continue;
      }

      // 過去の確定シフト数を取得
      const { data: confirmedShifts, error: shiftsError } = await supabase
        .from('assigned_shifts')
        .select('id, created_at')
        .eq('pharmacist_id', pharmacistId);
      
      if (shiftsError) {
        console.error('Error fetching confirmed shifts:', shiftsError);
        continue;
      }

      // 直近30日間の活動を計算
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRequests = requests?.filter(req => 
        new Date(req.created_at) >= thirtyDaysAgo
      ).length || 0;

      const totalRequests = requests?.length || 0;
      const successfulMatches = confirmedShifts?.length || 0;
      const successRate = totalRequests > 0 ? successfulMatches / totalRequests : 0;

      // 優先度スコアの計算
      // 希望回数が多いほど、成功率が高いほど優先
      const priorityScore = calculatePriorityScore({
        totalRequests,
        successRate,
        recentRequests
      });

      historyMap.set(pharmacistId, {
        pharmacist_id: pharmacistId,
        total_requests: totalRequests,
        successful_matches: successfulMatches,
        success_rate: successRate,
        recent_activity: recentRequests,
        priority_score: priorityScore
      });
    }
  } catch (error) {
    console.error('Error getting pharmacist history:', error);
  }

  return historyMap;
};

/**
 * 優先度スコアの計算
 * 希望回数が多い薬剤師を優先しつつ、成功率も考慮
 */
const calculatePriorityScore = (data: {
  totalRequests: number;
  successRate: number;
  recentRequests: number;
}): number => {
  const { totalRequests, successRate, recentRequests } = data;
  
  // 基本スコア: 希望回数が多いほど高スコア
  const requestScore = Math.min(totalRequests / 10, 1.0); // 最大1.0
  
  // 成功率スコア: 成功率が高いほど高スコア
  const successScore = successRate;
  
  // 最近の活動スコア: 最近活動しているほど高スコア
  const activityScore = Math.min(recentRequests / 5, 1.0); // 最大1.0
  
  // 重み付け: 希望回数 50%, 成功率 30%, 最近の活動 20%
  const priorityScore = (
    requestScore * 0.5 +
    successScore * 0.3 +
    activityScore * 0.2
  );
  
  return Math.min(priorityScore, 1.0);
};

/**
 * 薬剤師の履歴を考慮したマッチング候補のソート
 */
export const sortPharmacistsByHistory = (
  requests: any[],
  pharmacistHistory: Map<string, PharmacistHistory>
): any[] => {
  return requests.sort((a, b) => {
    const aHistory = pharmacistHistory.get(a.pharmacist_id);
    const bHistory = pharmacistHistory.get(b.pharmacist_id);
    
    // 履歴がない場合は最後に配置
    if (!aHistory && !bHistory) return 0;
    if (!aHistory) return 1;
    if (!bHistory) return -1;
    
    // 優先度スコアでソート（高い順）
    return bHistory.priority_score - aHistory.priority_score;
  });
};

/**
 * 薬剤師の履歴を考慮したマッチング実行
 */
export const executeHistoryBasedMatching = async (
  requests: any[],
  postings: any[],
  userProfiles?: any
): Promise<any[]> => {
  console.log('=== 履歴ベースマッチング開始 ===');
  
  // 薬剤師の履歴を取得
  const pharmacistIds = requests.map(req => req.pharmacist_id);
  const pharmacistHistory = await getPharmacistHistory(pharmacistIds);
  
  console.log('薬剤師履歴:', Array.from(pharmacistHistory.entries()).map(([id, history]) => ({
    id,
    totalRequests: history.total_requests,
    successRate: history.success_rate,
    priorityScore: history.priority_score
  })));
  
  // 履歴を考慮して薬剤師をソート
  const sortedRequests = sortPharmacistsByHistory(requests, pharmacistHistory);
  
  console.log('ソート後の薬剤師順序:', sortedRequests.map(req => ({
    pharmacist_id: req.pharmacist_id,
    priority_score: pharmacistHistory.get(req.pharmacist_id)?.priority_score || 0
  })));
  
  // 通常のマッチングロジックを実行
  const matches: any[] = [];
  const usedPharmacists = new Set<string>();
  
  for (const request of sortedRequests) {
    if (usedPharmacists.has(request.pharmacist_id)) continue;
    
    // 時間適合性をチェック
    const compatiblePostings = postings.filter(posting => 
      isTimeCompatible(request, posting)
    );
    
    if (compatiblePostings.length > 0) {
      // 最初の適合するポスティングを選択
      const selectedPosting = compatiblePostings[0];
      
      matches.push({
        pharmacist_id: request.pharmacist_id,
        pharmacy_id: selectedPosting.pharmacy_id,
        date: selectedPosting.date,
        start_time: selectedPosting.start_time,
        end_time: selectedPosting.end_time,
        status: 'confirmed',
        matching_algorithm: 'history_based',
        pharmacist_priority_score: pharmacistHistory.get(request.pharmacist_id)?.priority_score || 0
      });
      
      usedPharmacists.add(request.pharmacist_id);
    }
  }
  
  console.log('履歴ベースマッチング結果:', matches.length, '件');
  return matches;
};

/**
 * 時間適合性のチェック
 */
const isTimeCompatible = (request: any, posting: any): boolean => {
  const requestStart = timeToMinutes(request.start_time);
  const requestEnd = timeToMinutes(request.end_time);
  const postingStart = timeToMinutes(posting.start_time);
  const postingEnd = timeToMinutes(posting.end_time);
  
  // 薬剤師が薬局の希望時間を完全にカバーしているかチェック
  return requestStart <= postingStart && requestEnd >= postingEnd;
};

/**
 * 時間を分単位に変換
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};
