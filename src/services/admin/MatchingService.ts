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
  // ステータスが'confirmed'以外の希望・募集のみを表示
  const filteredRequests = requests.filter((request: any) => {
    return request.status !== 'confirmed';
  });

  const filteredPostings = postings.filter((posting: any) => {
    return posting.status !== 'confirmed';
  });

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

  // ヘルパー関数
  const getProfile = (id: string) => {
    if (!userProfiles) return {} as any;
    if (Array.isArray(userProfiles)) {
      return (userProfiles as any[]).find((u: any) => u?.id === id) || ({} as any);
    }
    return (userProfiles as any)[id] || ({} as any);
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
          name: match.storeName || match.pharmacy?.name || 'Unknown',
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
          date: match.pharmacyNeed.date || new Date().toISOString().split('T')[0]
        },
        timeSlot: {
          start: match.pharmacyNeed.start_time,
          end: match.pharmacyNeed.end_time,
          date: match.pharmacyNeed.date || new Date().toISOString().split('T')[0],
          urgency: 'medium',
          flexibility: 0
        },
        compatibilityScore: match.pharmacistRating / 5,
        reasons: [`評価${match.pharmacistRating}`, `優先度${match.priority}`, '時間範囲適合']
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

  // 薬剤師を距離・希望回数・評価の優先順位でソート
  const sortedRequests = filteredRequests
    .filter((r: any) => r.start_time && r.end_time)
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

  // 各薬局の必要人数を管理
  const pharmacyNeeds = filteredPostings.map((p: any) => ({
    ...p,
    remaining: Number(p.required_staff) || 0
  }));

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
      }
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
    const allowedPostingStatuses = new Set(['open', 'recruiting']);
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

    // 募集/希望が0件の場合
    if (safeLength(filteredDayPostings) === 0 || safeLength(filteredDayRequests) === 0) {
      return [];
    }

    // マッチング分析を実行
    const matchingResult = performMatchingAnalysis(
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
            memo: `AIマッチング: ${match.compatibilityScore.toFixed(2)} score - ${match.reasons.join(', ')}`
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
