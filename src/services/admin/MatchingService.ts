/**
 * MatchingService.ts
 * AIマッチングロジックを管理するサービス
 *
 * AdminDashboard.tsxから抽出されたマッチング関連のビジネスロジック
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIMatchingEngine, MatchCandidate } from '../../features/ai-matching/aiMatchingEngine';
import { safeArray, safeLength, safeObject } from '../../utils/admin/arrayHelpers';
import { getPharmacistRating } from '../../utils/admin/ratingHelpers';
import {
  calculateDistanceScore,
  calculateRequestCountScore,
} from '../../utils/admin/scoreCalculators';

/**
 * 時間範囲の互換性をチェックする関数
 */
export const isRangeCompatible = (request: any, posting: any): boolean => {
  const rs = request?.start_time;
  const re = request?.end_time;
  const ps = posting?.start_time;
  const pe = posting?.end_time;

  if (!rs || !re || !ps || !pe) return false;

  // 時間を数値に変換（HH:MM:SS形式を分に変換）
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const requestStart = timeToMinutes(rs);
  const requestEnd = timeToMinutes(re);
  const postingStart = timeToMinutes(ps);
  const postingEnd = timeToMinutes(pe);

  // 薬剤師の希望時間が薬局の募集時間を完全にカバーしているかチェック
  const isFullyCompatible = requestStart <= postingStart && requestEnd >= postingEnd;

  return isFullyCompatible;
};

/**
 * 確定済みの希望・募集をフィルタリングする関数
 */
export const filterConfirmedRequestsAndPostings = (
  requests: any[],
  postings: any[]
): { filteredRequests: any[]; filteredPostings: any[] } => {
  // ステータスが'confirmed'以外の希望のみを表示
  const filteredRequests = requests.filter((request: any) => {
    return request.status !== 'confirmed';
  });

  // 募集は常に表示する（required_staffが2以上の場合、部分確定でも募集継続のため）
  // 不足計算はカレンダー側で確定済み人数と比較して行う
  const filteredPostings = postings;

  // Debug logging removed for production performance
  // This function is called ~30 times per calendar render (once per day)

  return { filteredRequests, filteredPostings };
};

/**
 * 確定シフトをSupabaseから再読み込みする関数
 */
export const loadAssignedShifts = async (
  supabase: SupabaseClient
): Promise<any[]> => {
  try {
    if (!supabase) {
      console.error('Supabase client is not available');
      return [];
    }

    const { data: assignedData, error: assignedError } = await supabase
      .from('assigned_shifts')
      .select(`
        *,
        pharmacist:pharmacist_id(name),
        pharmacy:pharmacy_id(name)
      `)
      .order('created_at', { ascending: false });

    if (assignedError) {
      console.error('Error loading assigned shifts:', assignedError);
      return [];
    }

    return assignedData || [];
  } catch (error) {
    console.error('Error in loadAssignedShifts:', error);
    return [];
  }
};

/**
 * 簡易AIマッチングを実行する関数
 *
 * @param requests - シフト希望リスト
 * @param postings - シフト募集リスト
 * @param assigned - 確定済みシフトリスト
 * @param userProfiles - ユーザープロフィール
 * @param ratings - 薬剤師評価リスト
 * @returns マッチング結果
 */
export const executeSimpleAIMatching = async (
  requests: any[],
  postings: any[],
  assigned: any[],
  userProfiles: any,
  ratings: any[]
): Promise<MatchCandidate[]> => {
  // 確定済み店舗と薬剤師を取得して除外
  const confirmedShifts = Array.isArray(assigned)
    ? assigned.filter((s: any) => s?.status === 'confirmed')
    : [];
  const confirmedStores = new Set(
    confirmedShifts.map((s: any) => `${s.pharmacy_id}_${s.store_name || 'default'}`)
  );
  const confirmedPharmacists = new Set(
    confirmedShifts.map((s: any) => s.pharmacist_id)
  );

  // 確定済み店舗を除外した募集のみを使用
  const availablePostings = postings.filter((p: any) => {
    const storeKey = `${p.pharmacy_id}_${p.store_name || 'default'}`;
    return !confirmedStores.has(storeKey);
  });

  // 確定済み薬剤師を除外した希望のみを使用
  const availableRequests = requests.filter((r: any) => {
    return !confirmedPharmacists.has(r.pharmacist_id);
  });

  const matches: MatchCandidate[] = [];

  // ヘルパー関数: プロフィール取得（nullセーフ）
  const getProfile = (id: string): any | null => {
    if (!userProfiles) {
      console.warn('[MatchingService] userProfiles is not available');
      return null;
    }
    if (Array.isArray(userProfiles)) {
      return (userProfiles as any[]).find((u: any) => u?.id === id) ?? null;
    }
    return (userProfiles as any)[id] ?? null;
  };

  // 薬剤師を評価と優先順位でソート
  const sortedRequests = availableRequests.sort((a: any, b: any) => {
    const aRating = getPharmacistRating(a.pharmacist_id, ratings);
    const bRating = getPharmacistRating(b.pharmacist_id, ratings);

    if (aRating !== bRating) {
      return bRating - aRating;
    }

    const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const remainingRequired = availablePostings.reduce(
    (sum: number, p: any) => sum + (Number(p.required_staff) || 0),
    0
  );

  // 各薬局の必要人数を管理
  const pharmacyNeeds = availablePostings.map((p: any) => ({
    ...p,
    remaining: Number(p.required_staff) || 0
  }));

  // 全ての可能なマッチングの組み合わせを生成
  const allPossibleMatches: any[] = [];

  for (const request of availableRequests) {
    const pharmacist = getProfile(request.pharmacist_id);
    if (!pharmacist) continue;

    const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list)
      ? pharmacist.ng_list
      : [];

    for (const pharmacyNeed of pharmacyNeeds) {
      if (pharmacyNeed.remaining <= 0) continue;

      const pharmacy = getProfile(pharmacyNeed.pharmacy_id);
      if (!pharmacy) continue;

      const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list)
        ? pharmacy.ng_list
        : [];

      const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
      const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

      // 時間範囲の互換性を考慮
      if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed)) {
        // 店舗名を取得
        const getStoreNameFromPosting = (posting: any) => {
          const direct = (posting.store_name || posting.pharmacy_name || '').trim();
          let fromMemo = '';
          if (!direct && typeof posting.memo === 'string') {
            const m = posting.memo.match(/\[store:([^\]]+)\]/);
            if (m && m[1]) fromMemo = m[1];
          }
          return direct || fromMemo || '';
        };

        const storeName = getStoreNameFromPosting(pharmacyNeed);

        // スコア計算（段階的優先順位用）
        const distanceScore = calculateDistanceScore(pharmacist, pharmacy);
        const requestCountScore = calculateRequestCountScore(request.pharmacist_id, requests);
        const pharmacistRating = getPharmacistRating(request.pharmacist_id, ratings);
        const ratingScore = pharmacistRating / 5;

        // totalScoreは表示用に保持（実際のソートは段階的優先順位で行う）
        const totalScore = (distanceScore * 0.4) + (requestCountScore * 0.3) + (ratingScore * 0.3);

        allPossibleMatches.push({
          request,
          pharmacyNeed,
          pharmacist,
          pharmacy,
          storeName,
          distanceScore,
          requestCountScore,
          ratingScore,
          totalScore,
          timeSlot: {
            start: pharmacyNeed.start_time,
            end: pharmacyNeed.end_time,
            date: request.date,
            urgency: 'medium',
            flexibility: 0
          },
          compatibilityScore: totalScore,
          reasons: ['時間適合', '距離適合']
        });
      }
    }
  }

  // 段階的優先順位でソート: 距離 → シフト希望回数 → 評価
  allPossibleMatches.sort((a, b) => {
    // 1. 距離で比較（距離が近い方が優先 = distanceScoreが高い方が優先）
    if (Math.abs(a.distanceScore - b.distanceScore) > 0.01) {
      return b.distanceScore - a.distanceScore;
    }

    // 2. 距離が同じ場合、シフト希望回数で比較（回数が少ない方が優先 = requestCountScoreが低い方が優先）
    if (Math.abs(a.requestCountScore - b.requestCountScore) > 0.01) {
      return a.requestCountScore - b.requestCountScore;
    }

    // 3. 回数も同じ場合、評価で比較（評価が高い方が優先）
    return b.ratingScore - a.ratingScore;
  });

  // 最適解を構築
  const findOptimalSolution = (possibleMatches: any[]): MatchCandidate[] => {
    // 段階的優先順位でソート（既に親関数でソート済みだが念のため）
    const sortedMatches = [...possibleMatches].sort((a, b) => {
      if (Math.abs(a.distanceScore - b.distanceScore) > 0.01) {
        return b.distanceScore - a.distanceScore;
      }
      if (Math.abs(a.requestCountScore - b.requestCountScore) > 0.01) {
        return a.requestCountScore - b.requestCountScore;
      }
      return b.ratingScore - a.ratingScore;
    });

    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const pharmacyNeedsMap = new Map<string, number>();

    // 各薬局の必要人数を初期化
    for (const pharmacyNeed of pharmacyNeeds) {
      const key = `${pharmacyNeed.pharmacy_id}_${pharmacyNeed.store_name || 'default'}`;
      pharmacyNeedsMap.set(key, Number(pharmacyNeed.required_staff) || 1);
    }

    // 貪欲法で最適解を構築
    for (const match of sortedMatches) {
      const key = `${match.pharmacyNeed.pharmacy_id}_${match.pharmacyNeed.store_name || 'default'}`;
      const remaining = pharmacyNeedsMap.get(key) || 0;

      // 制約チェック
      if (usedPharmacists.has(match.request.pharmacist_id) || remaining <= 0) {
        continue;
      }

      // マッチングを追加
      selectedMatches.push({
        pharmacist: {
          id: match.request.pharmacist_id,
          name: match.pharmacist?.name || 'Unknown',
          email: '',
          rating: match.pharmacistRating || 0,
          preferences: {
            preferredPharmacyTypes: [],
            maxCommuteTime: 60,
            preferredTimeSlots: []
          },
          pastPerformance: {
            totalShifts: 0,
            averageSatisfaction: 0,
            completionRate: 1.0,
            noShowRate: 0
          }
        },
        pharmacy: {
          id: match.pharmacyNeed.pharmacy_id,
          name: match.pharmacy?.name || 'Unknown',
          store_name: match.storeName || '',
          requirements: {
            requiredSkills: [],
            experienceLevel: 'intermediate',
            specialNeeds: []
          },
          environment: {
            type: 'community',
            size: 'medium',
            specialties: []
          },
          pastPerformance: {
            averagePharmacistSatisfaction: 0,
            retentionRate: 1.0,
            workEnvironment: 0
          }
        },
        posting: {
          start_time: match.pharmacyNeed.start_time,
          end_time: match.pharmacyNeed.end_time,
          date: match.pharmacyNeed.date || new Date().toISOString().split('T')[0],
          store_name: match.storeName || ''
        },
        timeSlot: {
          start: match.pharmacyNeed.start_time,
          end: match.pharmacyNeed.end_time,
          date: match.pharmacyNeed.date || new Date().toISOString().split('T')[0],
          urgency: 'medium',
          flexibility: 0
        },
        compatibilityScore: match.pharmacistRating / 5,
        reasons: [`評価${match.pharmacistRating}`, `優先度${match.priority}`, '時間範囲適合'],
        memo: match.request.memo || '' // 薬剤師の備考を追加
      });

      // 状態更新
      usedPharmacists.add(match.request.pharmacist_id);
      pharmacyNeedsMap.set(key, remaining - 1);
    }

    return selectedMatches;
  };

  // 最適解を実行
  const optimalMatches = findOptimalSolution(allPossibleMatches);
  matches.push(...optimalMatches);

  return matches;
};

/**
 * マッチング分析を実行する関数
 *
 * @param dayRequests - 当日のシフト希望リスト
 * @param dayPostings - 当日のシフト募集リスト
 * @param date - 対象日付
 * @param assigned - 確定済みシフトリスト
 * @param userProfiles - ユーザープロフィール
 * @param ratings - 薬剤師評価リスト
 * @param requests - 全シフト希望リスト（希望回数計算用）
 * @param storeNgPharmacists - 薬局のNG薬剤師リスト（pharmacy_id -> NG薬剤師配列）
 * @param storeNgPharmacies - 薬剤師のNG薬局リスト（pharmacist_id -> NG薬局配列）
 * @returns マッチング分析結果
 */
export const performMatchingAnalysis = (
  dayRequests: any[],
  dayPostings: any[],
  date: string,
  assigned: any[],
  userProfiles: any,
  ratings: any[],
  requests: any[],
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): { matches: MatchCandidate[]; matchedCount: number; shortage: number } => {
  console.log('🔍 performMatchingAnalysis - dayPostings:', dayPostings.map(p => ({
    pharmacy_id: p.pharmacy_id,
    store_name: p.store_name,
    start_time: p.start_time,
    end_time: p.end_time
  })));

  // 確定済みの薬剤師・薬局を除外
  const confirmedPharmacists = new Set<string>();
  const confirmedPharmacies = new Set<string>();
  const confirmedStoreKeys = new Set<string>();

  if (Array.isArray(assigned)) {
    assigned.filter((s: any) => s?.date === date && s?.status === 'confirmed').forEach((s: any) => {
      confirmedPharmacists.add(s.pharmacist_id);
      confirmedPharmacies.add(s.pharmacy_id);
      const storeKey = `${s.pharmacy_id}_${(s.store_name || '').trim()}`;
      confirmedStoreKeys.add(storeKey);
    });
  }

  // 確定済みを除外したデータでマッチング分析
  const filteredRequests = dayRequests.filter((r: any) => !confirmedPharmacists.has(r.pharmacist_id));
  const filteredPostings = dayPostings.filter((p: any) => {
    // 店舗ごとの確定人数をカウント
    const storeKey = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
    const confirmedCountForStore = Array.from(confirmedStoreKeys).filter(key => key === storeKey).length;
    const requiredStaff = Number(p.required_staff) || 1;

    // 確定人数が募集人数に達していない場合のみマッチング対象
    const stillNeedsStaff = confirmedCountForStore < requiredStaff;

    return stillNeedsStaff;
  });

  // time_slotをstart_time/end_timeに変換（未設定の場合）
  const normalizeTime = (request: any) => {
    // 既にstart_time/end_timeがある場合はそのまま返す
    if (request.start_time && request.end_time) {
      return request;
    }

    // time_slotから時間を推定
    const timeSlotMap: { [key: string]: { start: string; end: string } } = {
      'morning': { start: '09:00:00', end: '13:00:00' },
      'afternoon': { start: '13:00:00', end: '18:00:00' },
      'fullday': { start: '09:00:00', end: '18:00:00' },
      'negotiable': { start: '09:00:00', end: '18:00:00' }
    };

    const timeSlot = request.time_slot || 'fullday';
    const times = timeSlotMap[timeSlot] || timeSlotMap['fullday'];

    return {
      ...request,
      start_time: times.start,
      end_time: times.end
    };
  };

  // 薬剤師を距離・希望回数・評価の優先順位でソート
  const sortedRequests = filteredRequests
    .map(normalizeTime)  // time_slotを時間に変換
    .filter((r: any) => r.start_time && r.end_time)  // 変換後にフィルター
    .sort((a: any, b: any) => {
      const aPharmacist = userProfiles[a.pharmacist_id];
      const bPharmacist = userProfiles[b.pharmacist_id];

      // 1. 距離スコア
      const aDistanceScore = aPharmacist ? calculateDistanceScore(aPharmacist, {}) : 0.5;
      const bDistanceScore = bPharmacist ? calculateDistanceScore(bPharmacist, {}) : 0.5;
      if (aDistanceScore !== bDistanceScore) return bDistanceScore - aDistanceScore;

      // 2. 希望回数スコア
      const aRequestCountScore = calculateRequestCountScore(a.pharmacist_id, requests);
      const bRequestCountScore = calculateRequestCountScore(b.pharmacist_id, requests);
      if (aRequestCountScore !== bRequestCountScore) return bRequestCountScore - aRequestCountScore;

      // 3. 評価スコア
      const aRating = getPharmacistRating(a.pharmacist_id, ratings);
      const bRating = getPharmacistRating(b.pharmacist_id, ratings);
      if (aRating !== bRating) return bRating - aRating;

      // 4. 優先度
      const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  // 各薬局の必要人数を管理（time_slotを時間に変換）
  const pharmacyNeeds = filteredPostings.map((p: any) => {
    const normalized = normalizeTime(p);
    return {
      ...normalized,
      remaining: Number(p.required_staff) || 0
    };
  });

  // 全薬剤師と薬局の組み合わせをスコア付きで収集
  const allMatchCandidates: any[] = [];

  sortedRequests.forEach((request: any) => {
    const pharmacist = userProfiles[request.pharmacist_id];

    for (const pharmacyNeed of pharmacyNeeds) {
      if (pharmacyNeed.remaining <= 0) continue;

      const pharmacy = userProfiles[pharmacyNeed.pharmacy_id];

      // NG設定チェック（store_ng_pharmacists, store_ng_pharmaciesテーブルを使用）
      let blockedByPharmacist = false;
      let blockedByPharmacy = false;

      // 薬剤師がNG指定している薬局をチェック
      if (storeNgPharmacies && storeNgPharmacies[request.pharmacist_id]) {
        const ngPharmacies = storeNgPharmacies[request.pharmacist_id];
        blockedByPharmacist = ngPharmacies.some((ng: any) =>
          ng.pharmacy_id === pharmacyNeed.pharmacy_id &&
          (!ng.store_name || ng.store_name === pharmacyNeed.store_name)
        );
      }

      // 薬局がNG指定している薬剤師をチェック
      if (storeNgPharmacists && storeNgPharmacists[pharmacyNeed.pharmacy_id]) {
        const ngPharmacists = storeNgPharmacists[pharmacyNeed.pharmacy_id];
        blockedByPharmacy = ngPharmacists.some((ng: any) =>
          ng.pharmacist_id === request.pharmacist_id &&
          (!ng.store_name || ng.store_name === pharmacyNeed.store_name)
        );
      }

      // 時間範囲互換性をチェック
      const rs = request?.start_time;
      const re = request?.end_time;
      const ps = pharmacyNeed?.start_time;
      const pe = pharmacyNeed?.end_time;

      let isCompatible = false;
      if (rs && re && ps && pe) {
        const timeToMinutes = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const requestStart = timeToMinutes(rs);
        const requestEnd = timeToMinutes(re);
        const postingStart = timeToMinutes(ps);
        const postingEnd = timeToMinutes(pe);

        // 薬剤師の希望時間が薬局の募集時間を完全にカバーしている
        isCompatible = requestStart <= postingStart && requestEnd >= postingEnd;
      }

      if (!blockedByPharmacist && !blockedByPharmacy && isCompatible) {
        // 優先順位に基づくスコア計算
        const distanceScore = calculateDistanceScore(pharmacist, pharmacy);
        const requestCountScore = calculateRequestCountScore(request.pharmacist_id, requests);
        const ratingScore = getPharmacistRating(request.pharmacist_id, ratings) / 5;

        allMatchCandidates.push({
          request,
          pharmacyNeed,
          pharmacist,
          pharmacy,
          distanceScore,
          requestCountScore,
          ratingScore
        });
      }
    }
  });

  // 段階的優先順位でソート（タイブレーク方式）
  // 1. 距離（近い方が優先） → 2. シフト希望回数（少ない方が優先） → 3. 評価（高い方が優先）
  allMatchCandidates.sort((a, b) => {
    // 1. 距離で比較（距離が近い方が優先 = distanceScoreが高い方が優先）
    if (Math.abs(a.distanceScore - b.distanceScore) > 0.01) {
      return b.distanceScore - a.distanceScore;
    }

    // 2. 距離が同じ場合、シフト希望回数で比較（回数が少ない方が優先 = requestCountScoreが低い方が優先）
    if (Math.abs(a.requestCountScore - b.requestCountScore) > 0.01) {
      return a.requestCountScore - b.requestCountScore;
    }

    // 3. 回数も同じ場合、評価で比較（評価が高い方が優先 = ratingScoreが高い方が優先）
    return b.ratingScore - a.ratingScore;
  });

  // 店舗別に募集人数分の薬剤師をマッチング
  const usedPharmacists = new Set<string>();
  const storeMatches = new Map<string, any[]>();

  // 店舗キー（pharmacy_id + store_name）でグルーピング
  for (const candidate of allMatchCandidates) {
    const storeKey = `${candidate.pharmacyNeed.pharmacy_id}_${(candidate.pharmacyNeed.store_name || '').trim()}`;
    if (!storeMatches.has(storeKey)) {
      storeMatches.set(storeKey, []);
    }
    storeMatches.get(storeKey)!.push(candidate);
  }

  // 各店舗について、募集人数分の薬剤師をマッチング
  let matchedCount = 0;
  const matchedPharmacists = [] as any[];
  const matchedPharmacies = [] as any[];

  for (const [storeKey, candidates] of storeMatches) {
    const pharmacyNeed = candidates[0].pharmacyNeed;
    const requiredStaff = pharmacyNeed.required_staff || 1;
    let matchedForStore = 0;

    for (const candidate of candidates) {
      if (matchedForStore >= requiredStaff) break;
      if (usedPharmacists.has(candidate.request.pharmacist_id)) continue;

      matchedCount++;
      matchedPharmacists.push(candidate.request);
      matchedPharmacies.push(candidate.pharmacyNeed);
      matchedForStore++;
      usedPharmacists.add(candidate.request.pharmacist_id);
    }
  }

  // マッチング結果をMatchCandidate形式に変換
  const matches: MatchCandidate[] = matchedPharmacists.map((pharmacist, index) => {
    const pharmacistId = pharmacist.pharmacist_id;
    const pharmacyId = matchedPharmacies[index].pharmacy_id;
    const pharmacistProfile = userProfiles[pharmacistId];
    const pharmacyProfile = userProfiles[pharmacyId];

    // 薬剤師名の取得（名前 → email → ID末尾4桁）
    let pharmacistName = '薬剤師名未設定';
    if (pharmacistProfile) {
      if (pharmacistProfile.name && pharmacistProfile.name.trim()) {
        pharmacistName = pharmacistProfile.name.trim();
      } else if (pharmacistProfile.email && pharmacistProfile.email.trim()) {
        pharmacistName = pharmacistProfile.email.split('@')[0];
      } else if (pharmacistId) {
        pharmacistName = `薬剤師${pharmacistId.slice(-4)}`;
      }
    } else if (pharmacistId) {
      pharmacistName = `薬剤師${pharmacistId.slice(-4)}`;
    }

    // 薬局名の取得（名前 → email → ID末尾4桁）
    let pharmacyName = '薬局名未設定';
    if (pharmacyProfile) {
      if (pharmacyProfile.name && pharmacyProfile.name.trim()) {
        pharmacyName = pharmacyProfile.name.trim();
      } else if (pharmacyProfile.email && pharmacyProfile.email.trim()) {
        pharmacyName = pharmacyProfile.email.split('@')[0];
      } else if (pharmacyId) {
        pharmacyName = `薬局${pharmacyId.slice(-4)}`;
      }
    } else if (pharmacyId) {
      pharmacyName = `薬局${pharmacyId.slice(-4)}`;
    }

    // 店舗名の取得（shift_postingsを優先して、どの店舗の募集にマッチしたかを明確にする）
    const storeName = matchedPharmacies[index].store_name ||
                     pharmacyProfile?.store_name ||
                     '店舗名未設定';

    console.log('🔍 Creating match:', {
      pharmacistId,
      pharmacyId,
      posting_store_name: matchedPharmacies[index].store_name,
      profile_store_name: pharmacyProfile?.store_name,
      final_storeName: storeName
    });

    return {
      pharmacist: {
        id: pharmacistId,
        name: pharmacistName
      },
      pharmacy: {
        id: pharmacyId,
        name: pharmacyName,
        store_name: storeName
      },
      timeSlot: {
        start: matchedPharmacies[index].start_time,
        end: matchedPharmacies[index].end_time,
        date: pharmacist.date
      },
      compatibilityScore: 0.8,
      reasons: ['時間適合', '距離適合'],
      // 店舗名を含むposting情報を追加
      posting: {
        start_time: matchedPharmacies[index].start_time,
        end_time: matchedPharmacies[index].end_time,
        store_name: storeName
      },
      memo: pharmacist.memo || '' // 薬剤師の備考を追加
    };
  });

  return {
    matches,
    matchedCount,
    shortage: Math.max(0, dayPostings.reduce((sum, p) => sum + (Number(p.required_staff) || 0), 0) - matchedCount)
  };
};

/**
 * 完全なAIマッチングを実行する関数（データベースへの保存含む）
 *
 * @param date - 対象日付
 * @param supabase - Supabaseクライアント
 * @param requests - シフト希望リスト
 * @param postings - シフト募集リスト
 * @param assigned - 確定済みシフトリスト
 * @param userProfiles - ユーザープロフィール
 * @param ratings - 薬剤師評価リスト
 * @param aiMatchingEngine - AIマッチングエンジン
 * @param storeNgPharmacists - 薬局のNG薬剤師リスト
 * @param storeNgPharmacies - 薬剤師のNG薬局リスト
 * @returns マッチング結果
 */
export const executeAIMatching = async (
  date: string,
  supabase: SupabaseClient,
  requests: any[],
  postings: any[],
  assigned: any[],
  userProfiles: any,
  ratings: any[],
  aiMatchingEngine: AIMatchingEngine | null,
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): Promise<MatchCandidate[]> => {
  console.log('🔍 executeAIMatching called for date:', date);
  console.log('🔍 Requests count:', requests?.length || 0);
  console.log('🔍 Postings count:', postings?.length || 0);

  if (!aiMatchingEngine) {
    console.error('AI Matching Engine not initialized');
    return [];
  }

  try {
    // 最新の確定シフトを取得
    let freshAssigned: any[] = Array.isArray(assigned) ? (assigned as any[]) : [];
    try {
      if (supabase) {
        const { data: fresh, error: freshErr } = await supabase
          .from('assigned_shifts')
          .select('pharmacist_id, pharmacy_id, date, status, store_name')
          .eq('date', date)
          .eq('status', 'confirmed');
        if (!freshErr && Array.isArray(fresh)) {
          freshAssigned = fresh;
        }
      }
    } catch (e) {
      console.warn('最新の確定シフト取得に失敗:', e);
    }

    // 最新のデータを再取得
    let freshRequests: any[] = [];
    let freshPostings: any[] = [];

    if (supabase) {
      const { data: requestsData } = await supabase
        .from('shift_requests')
        .select('*')
        .eq('date', date);
      if (requestsData) freshRequests = requestsData;

      const { data: postingsData } = await supabase
        .from('shift_postings')
        .select('*')
        .eq('date', date);
      if (postingsData) freshPostings = postingsData;
    }

    // 未確定のみ抽出
    const dayRequests = freshRequests.filter((r: any) => r.status !== 'confirmed');
    const dayPostings = freshPostings.filter((p: any) => p.status !== 'confirmed');

    // 確定済みの組み合わせをセット化
    const confirmedPharmacists = new Set<string>();
    const confirmedStoreKeys = new Set<string>();
    if (Array.isArray(freshAssigned)) {
      (freshAssigned as any[]).forEach((s: any) => {
        if (s?.status === 'confirmed' && s?.date === date) {
          confirmedPharmacists.add(s.pharmacist_id);
          const storeKey = `${s.pharmacy_id}_${(s.store_name || '').trim()}`;
          confirmedStoreKeys.add(storeKey);
        }
      });
    }

    // 薬局側も未確定のみでマッチング
    const allowedPostingStatuses = new Set(['open']);
    const filteredDayPostings = dayPostings.filter((p: any) => {
      if (!allowedPostingStatuses.has((p.status || '').toLowerCase())) return false;

      // 店舗ごとの確定人数をカウント
      const storeKey = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
      const confirmedCountForStore = Array.from(confirmedStoreKeys).filter(key => key === storeKey).length;
      const requiredStaff = Number(p.required_staff) || 1;

      // 確定人数が募集人数に達していない場合のみマッチング対象
      return confirmedCountForStore < requiredStaff;
    });
    const filteredDayRequests = dayRequests.filter((r: any) => !confirmedPharmacists.has(r.pharmacist_id));

    console.log(`🔍 ${date} - Filtered postings:`, filteredDayPostings.length);
    console.log(`🔍 ${date} - Filtered requests:`, filteredDayRequests.length);

    // 募集/希望が0件の場合
    if (safeLength(filteredDayPostings) === 0 || safeLength(filteredDayRequests) === 0) {
      console.log(`⚠️ ${date} - マッチング不可: 募集=${filteredDayPostings.length}, 希望=${filteredDayRequests.length}`);
      return [];
    }

    // マッチング分析を実行（最適化アルゴリズムを使用）
    const matchingResult = performOptimizedMatching(
      filteredDayRequests,
      filteredDayPostings,
      date,
      assigned,
      userProfiles,
      ratings,
      requests,
      storeNgPharmacists,
      storeNgPharmacies
    );
    const matches = matchingResult.matches;

    // マッチング結果をassigned_shiftsテーブルに保存
    if (safeLength(matches) > 0 && supabase) {
      try {
        // その日付の古い pending マッチングのみを削除
        const { error: deleteError } = await supabase
          .from('assigned_shifts')
          .delete()
          .eq('date', date)
          .eq('status', 'pending');

        if (deleteError) {
          console.error('古い pending マッチングの削除エラー:', deleteError);
        } else {
          console.log(`${date} の古い pending マッチングを削除しました`);
        }

        const shiftsToInsert = matches.map((match: any) => {
          // match.pharmacy.store_name（shift_postings由来）を優先的に使用
          const storeName = match.pharmacy.store_name ||
                           match.posting?.store_name ||
                           '店舗名なし';

          return {
            pharmacist_id: match.pharmacist.id,
            pharmacy_id: match.pharmacy.id,
            date: date,
            time_slot: 'fullday',
            start_time: match.timeSlot?.start || '09:00:00',
            end_time: match.timeSlot?.end || '18:00:00',
            status: 'pending',
            store_name: storeName,
            memo: match.memo || '' // 薬剤師の備考を保持
          };
        });

        const { data: insertedShifts, error: insertError } = await supabase
          .from('assigned_shifts')
          .insert(shiftsToInsert)
          .select();

        if (insertError) {
          console.error('assigned_shiftsテーブルへの保存エラー:', insertError);
        }
      } catch (error) {
        console.error('マッチング結果保存エラー:', error);
      }
    }

    return matches;
  } catch (error) {
    console.error('AI Matching failed:', error);
    return [];
  }
};

/**
 * ========================================
 * 最適化マッチングアルゴリズム
 * ========================================
 * 不足薬局をゼロに近づけることを優先したマッチングアルゴリズム
 */

/**
 * 互換性情報を格納する型
 */
interface CompatibilityInfo {
  storeKey: string;
  pharmacistId: string;
  isCompatible: boolean;
  score: number;
  distanceScore: number;
  requestCountScore: number;
  ratingScore: number;
  request: any;
  posting: any;
}

/**
 * 割り当て情報を格納する型
 */
interface OptimizedAssignment {
  storeKey: string;
  pharmacistId: string;
  posting: any;
  request: any;
  score: number;
}

/**
 * 互換性マトリクスを構築
 */
const buildOptimizedCompatibilityMatrix = (
  dayRequests: any[],
  dayPostings: any[],
  userProfiles: any,
  ratings: any[],
  requests: any[],
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): CompatibilityInfo[] => {
  const compatibilityList: CompatibilityInfo[] = [];

  // 時間を正規化する関数
  const normalizeTime = (item: any) => {
    if (item.start_time && item.end_time) {
      return item;
    }
    const timeSlotMap: { [key: string]: { start: string; end: string } } = {
      'morning': { start: '09:00:00', end: '13:00:00' },
      'afternoon': { start: '13:00:00', end: '18:00:00' },
      'fullday': { start: '09:00:00', end: '18:00:00' },
      'negotiable': { start: '09:00:00', end: '18:00:00' }
    };
    const timeSlot = item.time_slot || 'fullday';
    const times = timeSlotMap[timeSlot] || timeSlotMap['fullday'];
    return { ...item, start_time: times.start, end_time: times.end };
  };

  // 時間を分に変換
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 各薬剤師リクエストに対して
  for (const request of dayRequests) {
    const normalizedRequest = normalizeTime(request);
    const pharmacist = userProfiles[request.pharmacist_id];

    if (!normalizedRequest.start_time || !normalizedRequest.end_time) continue;

    // 各薬局募集に対して
    for (const posting of dayPostings) {
      const normalizedPosting = normalizeTime(posting);
      const pharmacy = userProfiles[posting.pharmacy_id];
      const storeKey = `${posting.pharmacy_id}_${(posting.store_name || '').trim()}`;

      if (!normalizedPosting.start_time || !normalizedPosting.end_time) continue;

      // NGリストチェック
      let blockedByPharmacist = false;
      let blockedByPharmacy = false;

      if (storeNgPharmacies && storeNgPharmacies[request.pharmacist_id]) {
        const ngPharmacies = storeNgPharmacies[request.pharmacist_id];
        blockedByPharmacist = ngPharmacies.some((ng: any) =>
          ng.pharmacy_id === posting.pharmacy_id &&
          (!ng.store_name || ng.store_name === posting.store_name)
        );
      }

      if (storeNgPharmacists && storeNgPharmacists[posting.pharmacy_id]) {
        const ngPharmacists = storeNgPharmacists[posting.pharmacy_id];
        blockedByPharmacy = ngPharmacists.some((ng: any) =>
          ng.pharmacist_id === request.pharmacist_id &&
          (!ng.store_name || ng.store_name === posting.store_name)
        );
      }

      // 時間互換性チェック（100%カバー必須）
      const requestStart = timeToMinutes(normalizedRequest.start_time);
      const requestEnd = timeToMinutes(normalizedRequest.end_time);
      const postingStart = timeToMinutes(normalizedPosting.start_time);
      const postingEnd = timeToMinutes(normalizedPosting.end_time);
      const isTimeCompatible = requestStart <= postingStart && requestEnd >= postingEnd;

      // 互換性判定
      const isCompatible = !blockedByPharmacist && !blockedByPharmacy && isTimeCompatible;

      // スコア計算
      const distanceScore = calculateDistanceScore(pharmacist, pharmacy);
      const requestCountScore = calculateRequestCountScore(request.pharmacist_id, requests);
      const ratingScore = getPharmacistRating(request.pharmacist_id, ratings) / 5;

      // 総合スコア（距離40%, 希望回数30%, 評価30%）
      const totalScore = distanceScore * 0.4 + (1 - requestCountScore) * 0.3 + ratingScore * 0.3;

      compatibilityList.push({
        storeKey,
        pharmacistId: request.pharmacist_id,
        isCompatible,
        score: totalScore,
        distanceScore,
        requestCountScore,
        ratingScore,
        request: normalizedRequest,
        posting: normalizedPosting
      });
    }
  }

  return compatibilityList;
};

/**
 * フェーズ1: 不足最小化マッチング
 * 候補者が少ない店舗から優先的に処理
 */
const minimizeShortageMatching = (
  compatibilityMatrix: CompatibilityInfo[],
  dayPostings: any[]
): OptimizedAssignment[] => {
  const assignments: OptimizedAssignment[] = [];
  const usedPharmacists = new Set<string>();

  // 店舗ごとに候補者リストを作成
  const storeMap = new Map<string, { posting: any; candidates: CompatibilityInfo[] }>();

  for (const posting of dayPostings) {
    const storeKey = `${posting.pharmacy_id}_${(posting.store_name || '').trim()}`;
    const candidates = compatibilityMatrix.filter(c =>
      c.storeKey === storeKey && c.isCompatible
    );

    storeMap.set(storeKey, {
      posting,
      candidates: candidates.sort((a, b) => b.score - a.score) // スコア降順
    });
  }

  // 候補者が少ない店舗から処理（制約が厳しい順）
  const sortedStores = Array.from(storeMap.entries()).sort((a, b) => {
    const aCandidates = a[1].candidates.length;
    const bCandidates = b[1].candidates.length;

    // 1. 候補者数が少ない方を優先
    if (aCandidates !== bCandidates) {
      return aCandidates - bCandidates;
    }

    // 2. 必要人数が多い方を優先
    const aRequired = Number(a[1].posting.required_staff) || 1;
    const bRequired = Number(b[1].posting.required_staff) || 1;
    return bRequired - aRequired;
  });

  console.log('🎯 店舗処理順序:');
  sortedStores.forEach(([storeKey, data], index) => {
    console.log(`  ${index + 1}. ${storeKey}: 候補者${data.candidates.length}人, 必要${data.posting.required_staff}人`);
  });

  // 各店舗に対して必要人数分を割り当て
  for (const [storeKey, storeData] of sortedStores) {
    const requiredStaff = Number(storeData.posting.required_staff) || 1;
    let assignedCount = 0;

    for (const candidate of storeData.candidates) {
      if (assignedCount >= requiredStaff) break;
      if (usedPharmacists.has(candidate.pharmacistId)) continue;

      assignments.push({
        storeKey,
        pharmacistId: candidate.pharmacistId,
        posting: candidate.posting,
        request: candidate.request,
        score: candidate.score
      });

      usedPharmacists.add(candidate.pharmacistId);
      assignedCount++;
    }

    console.log(`  ✅ ${storeKey}: ${assignedCount}/${requiredStaff}人割り当て`);
  }

  return assignments;
};

/**
 * フェーズ2: 再配置による最適化（オプション）
 * 不足がある店舗に対して、他店舗から薬剤師を再配置できるか試行
 */
const refineAssignments = (
  assignments: OptimizedAssignment[],
  compatibilityMatrix: CompatibilityInfo[],
  dayPostings: any[]
): OptimizedAssignment[] => {
  const assignmentMap = new Map<string, OptimizedAssignment[]>();

  // 店舗ごとに割り当てをグループ化
  for (const assignment of assignments) {
    if (!assignmentMap.has(assignment.storeKey)) {
      assignmentMap.set(assignment.storeKey, []);
    }
    assignmentMap.get(assignment.storeKey)!.push(assignment);
  }

  // 不足がある店舗を特定
  const shortageStores: { storeKey: string; shortage: number; posting: any }[] = [];
  for (const posting of dayPostings) {
    const storeKey = `${posting.pharmacy_id}_${(posting.store_name || '').trim()}`;
    const assignedCount = assignmentMap.get(storeKey)?.length || 0;
    const requiredStaff = Number(posting.required_staff) || 1;
    const shortage = requiredStaff - assignedCount;

    if (shortage > 0) {
      shortageStores.push({ storeKey, shortage, posting });
    }
  }

  if (shortageStores.length === 0) {
    console.log('✨ 全店舗の必要人数を満たしました！');
    return assignments;
  }

  console.log(`🔄 再配置を試行: ${shortageStores.length}店舗に不足`);

  let improved = true;
  let iteration = 0;
  const maxIterations = 10;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    for (const shortageStore of shortageStores) {
      // この不足店舗に割り当て可能な薬剤師を探す
      const reassignableCandidates = compatibilityMatrix.filter(c =>
        c.storeKey === shortageStore.storeKey && c.isCompatible
      );

      for (const candidate of reassignableCandidates) {
        // この薬剤師が現在別の店舗に割り当てられているか確認
        const currentAssignment = assignments.find(a => a.pharmacistId === candidate.pharmacistId);

        if (!currentAssignment) continue;

        // 元の店舗の余裕を確認
        const originalStoreAssignments = assignmentMap.get(currentAssignment.storeKey) || [];
        const originalPosting = dayPostings.find(p => {
          const key = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
          return key === currentAssignment.storeKey;
        });
        const originalRequired = Number(originalPosting?.required_staff) || 1;

        // 元の店舗に余裕がある場合のみ再配置
        if (originalStoreAssignments.length > originalRequired * 0.5) { // 半分以上確保されている
          // 再配置を実行
          console.log(`  🔄 ${candidate.pharmacistId} を ${currentAssignment.storeKey} → ${shortageStore.storeKey} に再配置`);

          // 元の割り当てを削除
          const index = assignments.indexOf(currentAssignment);
          assignments.splice(index, 1);

          // 新しい割り当てを追加
          assignments.push({
            storeKey: shortageStore.storeKey,
            pharmacistId: candidate.pharmacistId,
            posting: candidate.posting,
            request: candidate.request,
            score: candidate.score
          });

          // マップを更新
          assignmentMap.get(currentAssignment.storeKey)!.splice(
            assignmentMap.get(currentAssignment.storeKey)!.indexOf(currentAssignment),
            1
          );
          if (!assignmentMap.has(shortageStore.storeKey)) {
            assignmentMap.set(shortageStore.storeKey, []);
          }
          assignmentMap.get(shortageStore.storeKey)!.push(assignments[assignments.length - 1]);

          improved = true;
          break;
        }
      }

      if (improved) break;
    }
  }

  return assignments;
};

/**
 * 最適化マッチング分析（不足最小化優先）
 */
export const performOptimizedMatching = (
  dayRequests: any[],
  dayPostings: any[],
  date: string,
  assigned: any[],
  userProfiles: any,
  ratings: any[],
  requests: any[],
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): { matches: MatchCandidate[]; matchedCount: number; shortage: number } => {
  console.log('🚀 最適化マッチングアルゴリズム開始');
  console.log(`📊 対象: ${dayPostings.length}店舗, ${dayRequests.length}薬剤師`);

  // 確定済みを除外
  const confirmedPharmacists = new Set<string>();
  const confirmedStoreKeys = new Set<string>();

  if (Array.isArray(assigned)) {
    assigned.filter((s: any) => s?.date === date && s?.status === 'confirmed').forEach((s: any) => {
      confirmedPharmacists.add(s.pharmacist_id);
      const storeKey = `${s.pharmacy_id}_${(s.store_name || '').trim()}`;
      confirmedStoreKeys.add(storeKey);
    });
  }

  const filteredRequests = dayRequests.filter((r: any) => !confirmedPharmacists.has(r.pharmacist_id));
  const filteredPostings = dayPostings.filter((p: any) => {
    const storeKey = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
    const confirmedCountForStore = Array.from(confirmedStoreKeys).filter(key => key === storeKey).length;
    const requiredStaff = Number(p.required_staff) || 1;
    return confirmedCountForStore < requiredStaff;
  });

  console.log(`🔍 フィルター後: ${filteredPostings.length}店舗, ${filteredRequests.length}薬剤師`);

  // ステップ1: 互換性マトリクスを構築
  const compatibilityMatrix = buildOptimizedCompatibilityMatrix(
    filteredRequests,
    filteredPostings,
    userProfiles,
    ratings,
    requests,
    storeNgPharmacists,
    storeNgPharmacies
  );

  const compatibleCount = compatibilityMatrix.filter(c => c.isCompatible).length;
  console.log(`✅ 互換性のある組み合わせ: ${compatibleCount}件`);

  // ステップ2: 不足最小化マッチング
  let assignments = minimizeShortageMatching(compatibilityMatrix, filteredPostings);
  console.log(`📝 フェーズ1完了: ${assignments.length}件の割り当て`);

  // ステップ3: 再配置による最適化
  assignments = refineAssignments(assignments, compatibilityMatrix, filteredPostings);
  console.log(`🎯 最終結果: ${assignments.length}件の割り当て`);

  // MatchCandidate形式に変換
  const matches: MatchCandidate[] = assignments.map(assignment => {
    const pharmacistProfile = userProfiles[assignment.pharmacistId];
    const pharmacyId = assignment.posting.pharmacy_id;
    const pharmacyProfile = userProfiles[pharmacyId];

    // 薬剤師名の取得
    let pharmacistName = '薬剤師名未設定';
    if (pharmacistProfile) {
      if (pharmacistProfile.name && pharmacistProfile.name.trim()) {
        pharmacistName = pharmacistProfile.name.trim();
      } else if (pharmacistProfile.email && pharmacistProfile.email.trim()) {
        pharmacistName = pharmacistProfile.email.split('@')[0];
      } else {
        pharmacistName = `薬剤師${assignment.pharmacistId.slice(-4)}`;
      }
    } else {
      pharmacistName = `薬剤師${assignment.pharmacistId.slice(-4)}`;
    }

    // 薬局名の取得
    let pharmacyName = '薬局名未設定';
    if (pharmacyProfile) {
      if (pharmacyProfile.name && pharmacyProfile.name.trim()) {
        pharmacyName = pharmacyProfile.name.trim();
      } else if (pharmacyProfile.email && pharmacyProfile.email.trim()) {
        pharmacyName = pharmacyProfile.email.split('@')[0];
      } else {
        pharmacyName = `薬局${pharmacyId.slice(-4)}`;
      }
    } else {
      pharmacyName = `薬局${pharmacyId.slice(-4)}`;
    }

    const storeName = assignment.posting.store_name ||
                     pharmacyProfile?.store_name ||
                     '店舗名未設定';

    return {
      pharmacist: {
        id: assignment.pharmacistId,
        name: pharmacistName
      },
      pharmacy: {
        id: pharmacyId,
        name: pharmacyName,
        store_name: storeName
      },
      timeSlot: {
        start: assignment.posting.start_time,
        end: assignment.posting.end_time,
        date: assignment.request.date
      },
      compatibilityScore: assignment.score,
      reasons: ['最適化マッチング', '時間適合', '距離考慮'],
      posting: {
        start_time: assignment.posting.start_time,
        end_time: assignment.posting.end_time,
        store_name: storeName
      },
      memo: assignment.request.memo || ''
    };
  });

  const totalRequired = filteredPostings.reduce((sum, p) => sum + (Number(p.required_staff) || 0), 0);
  const shortage = Math.max(0, totalRequired - matches.length);

  console.log(`📊 最終統計:`);
  console.log(`  - 必要人数: ${totalRequired}人`);
  console.log(`  - 割り当て: ${matches.length}人`);
  console.log(`  - 不足: ${shortage}人`);
  console.log(`  - カバー率: ${((matches.length / totalRequired) * 100).toFixed(1)}%`);

  return {
    matches,
    matchedCount: matches.length,
    shortage
  };
};

/**
 * ========================================
 * インタラクティブマッチング機能
 * ========================================
 * 手動で薬剤師を入れ替え可能にし、リアルタイムで再最適化
 */

/**
 * 特定の店舗に割り当て可能な全薬剤師を取得
 *
 * @param storeKey 店舗キー（pharmacy_id_store_name）
 * @param posting 募集情報
 * @param allRequests 全薬剤師リクエスト
 * @param userProfiles ユーザープロフィール
 * @param ratings 評価情報
 * @param requests 全リクエスト（スコア計算用）
 * @param storeNgPharmacists 薬局のNG薬剤師リスト
 * @param storeNgPharmacies 薬剤師のNG薬局リスト
 * @returns 候補者リスト（互換性チェック済み、スコア付き）
 */
export const getAvailableCandidatesForStore = (
  storeKey: string,
  posting: any,
  allRequests: any[],
  userProfiles: any,
  ratings: any[],
  requests: any[],
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): CompatibilityInfo[] => {
  const candidates: CompatibilityInfo[] = [];

  // 時間を正規化する関数
  const normalizeTime = (item: any) => {
    if (item.start_time && item.end_time) {
      return item;
    }
    const timeSlotMap: { [key: string]: { start: string; end: string } } = {
      'morning': { start: '09:00:00', end: '13:00:00' },
      'afternoon': { start: '13:00:00', end: '18:00:00' },
      'fullday': { start: '09:00:00', end: '18:00:00' },
      'negotiable': { start: '09:00:00', end: '18:00:00' }
    };
    const timeSlot = item.time_slot || 'fullday';
    const times = timeSlotMap[timeSlot] || timeSlotMap['fullday'];
    return { ...item, start_time: times.start, end_time: times.end };
  };

  // 時間を分に変換
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const normalizedPosting = normalizeTime(posting);
  if (!normalizedPosting.start_time || !normalizedPosting.end_time) {
    return [];
  }

  const postingStart = timeToMinutes(normalizedPosting.start_time);
  const postingEnd = timeToMinutes(normalizedPosting.end_time);

  // 全薬剤師リクエストをチェック
  for (const request of allRequests) {
    const normalizedRequest = normalizeTime(request);
    const pharmacist = userProfiles[request.pharmacist_id];

    if (!normalizedRequest.start_time || !normalizedRequest.end_time) continue;

    // NGリストチェック
    let blockedByPharmacist = false;
    let blockedByPharmacy = false;

    if (storeNgPharmacies && storeNgPharmacies[request.pharmacist_id]) {
      const ngPharmacies = storeNgPharmacies[request.pharmacist_id];
      blockedByPharmacist = ngPharmacies.some((ng: any) =>
        ng.pharmacy_id === posting.pharmacy_id &&
        (!ng.store_name || ng.store_name === posting.store_name)
      );
    }

    if (storeNgPharmacists && storeNgPharmacists[posting.pharmacy_id]) {
      const ngPharmacists = storeNgPharmacists[posting.pharmacy_id];
      blockedByPharmacy = ngPharmacists.some((ng: any) =>
        ng.pharmacist_id === request.pharmacist_id &&
        (!ng.store_name || ng.store_name === posting.store_name)
      );
    }

    // 時間互換性チェック（100%カバー必須）
    const requestStart = timeToMinutes(normalizedRequest.start_time);
    const requestEnd = timeToMinutes(normalizedRequest.end_time);
    const isTimeCompatible = requestStart <= postingStart && requestEnd >= postingEnd;

    // 互換性判定
    const isCompatible = !blockedByPharmacist && !blockedByPharmacy && isTimeCompatible;

    if (isCompatible) {
      // スコア計算
      const pharmacy = userProfiles[posting.pharmacy_id];
      const distanceScore = calculateDistanceScore(pharmacist, pharmacy);
      const requestCountScore = calculateRequestCountScore(request.pharmacist_id, requests);
      const ratingScore = getPharmacistRating(request.pharmacist_id, ratings) / 5;
      const totalScore = distanceScore * 0.4 + (1 - requestCountScore) * 0.3 + ratingScore * 0.3;

      candidates.push({
        storeKey,
        pharmacistId: request.pharmacist_id,
        isCompatible: true,
        score: totalScore,
        distanceScore,
        requestCountScore,
        ratingScore,
        request: normalizedRequest,
        posting: normalizedPosting
      });
    }
  }

  // スコア降順でソート
  return candidates.sort((a, b) => b.score - a.score);
};

/**
 * 固定された割り当てを含む型
 */
export interface LockedAssignment {
  storeKey: string;
  pharmacistId: string;
}

/**
 * 固定された割り当てを除いて再最適化
 *
 * @param lockedAssignments 固定された割り当て（手動変更）
 * @param dayRequests 全薬剤師リクエスト
 * @param dayPostings 全店舗募集
 * @param date 対象日付
 * @param assigned 確定済みシフト
 * @param userProfiles ユーザープロフィール
 * @param ratings 評価情報
 * @param requests 全リクエスト
 * @param storeNgPharmacists 薬局のNG薬剤師リスト
 * @param storeNgPharmacies 薬剤師のNG薬局リスト
 * @returns 最適化されたマッチング結果
 */
export const reoptimizeWithLockedAssignments = (
  lockedAssignments: LockedAssignment[],
  dayRequests: any[],
  dayPostings: any[],
  date: string,
  assigned: any[],
  userProfiles: any,
  ratings: any[],
  requests: any[],
  storeNgPharmacists?: { [pharmacyId: string]: any[] },
  storeNgPharmacies?: { [pharmacistId: string]: any[] }
): { matches: MatchCandidate[]; matchedCount: number; shortage: number } => {
  console.log('🔄 固定割り当てを含む再最適化開始');
  console.log(`📌 固定割り当て: ${lockedAssignments.length}件`);

  // 固定された薬剤師を除外
  const lockedPharmacistIds = new Set(lockedAssignments.map(la => la.pharmacistId));
  const filteredRequests = dayRequests.filter(r => !lockedPharmacistIds.has(r.pharmacist_id));

  // 固定された店舗の残り必要人数を計算
  const storeAssignmentCounts = new Map<string, number>();
  for (const locked of lockedAssignments) {
    storeAssignmentCounts.set(
      locked.storeKey,
      (storeAssignmentCounts.get(locked.storeKey) || 0) + 1
    );
  }

  // 店舗の残り必要人数を更新
  const adjustedPostings = dayPostings.map(posting => {
    const storeKey = `${posting.pharmacy_id}_${(posting.store_name || '').trim()}`;
    const lockedCount = storeAssignmentCounts.get(storeKey) || 0;
    const remainingStaff = Math.max(0, (Number(posting.required_staff) || 1) - lockedCount);

    return {
      ...posting,
      required_staff: remainingStaff,
      original_required_staff: Number(posting.required_staff) || 1
    };
  }).filter(p => p.required_staff > 0); // 残り必要人数が0の店舗は除外

  console.log(`🔍 残り最適化対象: ${adjustedPostings.length}店舗, ${filteredRequests.length}薬剤師`);

  // 残りを最適化
  const optimizationResult = performOptimizedMatching(
    filteredRequests,
    adjustedPostings,
    date,
    assigned,
    userProfiles,
    ratings,
    requests,
    storeNgPharmacists,
    storeNgPharmacies
  );

  // 固定された割り当てを MatchCandidate 形式に変換
  const lockedMatches: MatchCandidate[] = lockedAssignments.map(locked => {
    const posting = dayPostings.find(p => {
      const key = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
      return key === locked.storeKey;
    });

    const request = dayRequests.find(r => r.pharmacist_id === locked.pharmacistId);

    const pharmacistProfile = userProfiles[locked.pharmacistId];
    const pharmacyId = posting?.pharmacy_id;
    const pharmacyProfile = userProfiles[pharmacyId];

    // 薬剤師名の取得
    let pharmacistName = '薬剤師名未設定';
    if (pharmacistProfile) {
      if (pharmacistProfile.name && pharmacistProfile.name.trim()) {
        pharmacistName = pharmacistProfile.name.trim();
      } else if (pharmacistProfile.email && pharmacistProfile.email.trim()) {
        pharmacistName = pharmacistProfile.email.split('@')[0];
      } else {
        pharmacistName = `薬剤師${locked.pharmacistId.slice(-4)}`;
      }
    } else {
      pharmacistName = `薬剤師${locked.pharmacistId.slice(-4)}`;
    }

    // 薬局名の取得
    let pharmacyName = '薬局名未設定';
    if (pharmacyProfile) {
      if (pharmacyProfile.name && pharmacyProfile.name.trim()) {
        pharmacyName = pharmacyProfile.name.trim();
      } else if (pharmacyProfile.email && pharmacyProfile.email.trim()) {
        pharmacyName = pharmacyProfile.email.split('@')[0];
      } else {
        pharmacyName = `薬局${pharmacyId?.slice(-4)}`;
      }
    } else if (pharmacyId) {
      pharmacyName = `薬局${pharmacyId.slice(-4)}`;
    }

    const storeName = posting?.store_name ||
                     pharmacyProfile?.store_name ||
                     '店舗名未設定';

    return {
      pharmacist: {
        id: locked.pharmacistId,
        name: pharmacistName
      },
      pharmacy: {
        id: pharmacyId || '',
        name: pharmacyName,
        store_name: storeName
      },
      timeSlot: {
        start: posting?.start_time || request?.start_time || '09:00:00',
        end: posting?.end_time || request?.end_time || '18:00:00',
        date: request?.date || date
      },
      compatibilityScore: 1.0,
      reasons: ['手動割り当て（固定）'],
      posting: {
        start_time: posting?.start_time || '09:00:00',
        end_time: posting?.end_time || '18:00:00',
        store_name: storeName
      },
      memo: request?.memo || '',
      isLocked: true // 固定フラグ
    };
  });

  // 固定されたマッチと最適化されたマッチを結合
  const allMatches = [...lockedMatches, ...optimizationResult.matches];

  const totalRequired = dayPostings.reduce((sum, p) => sum + (Number(p.required_staff) || 0), 0);
  const shortage = Math.max(0, totalRequired - allMatches.length);

  console.log(`📊 再最適化結果:`);
  console.log(`  - 固定割り当て: ${lockedMatches.length}件`);
  console.log(`  - 最適化割り当て: ${optimizationResult.matches.length}件`);
  console.log(`  - 合計: ${allMatches.length}件`);
  console.log(`  - 不足: ${shortage}人`);

  return {
    matches: allMatches,
    matchedCount: allMatches.length,
    shortage
  };
};
