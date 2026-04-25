import { supabase } from '../../lib/supabase';
import { generateDistanceBasedMatches } from './distanceMatching';
import { executeHistoryBasedMatching } from './pharmacistHistoryMatching';

export interface MatchCandidate {
  pharmacist: {
    id: string;
    name: string;
    email?: string;
    rating?: number;
    preferences?: {
      preferredPharmacyTypes: string[];
      maxCommuteTime: number;
      preferredTimeSlots: string[];
    };
    pastPerformance?: {
      totalShifts: number;
      averageSatisfaction: number;
      completionRate: number;
      noShowRate: number;
    };
  };
  pharmacy: {
    id: string;
    name: string;
    requirements?: {
      requiredSkills: string[];
      experienceLevel: string;
      specialNeeds: string[];
    };
    environment?: {
      type: string;
      size: string;
      specialties: string[];
    };
    pastPerformance?: {
      averagePharmacistSatisfaction: number;
      retentionRate: number;
      workEnvironment: number;
    };
  };
  timeSlot: {
    start: string;
    end: string;
    date: string;
    urgency?: string;
    flexibility?: number;
  };
  compatibilityScore: number;
  reasons: string[];
  posting?: {
    start_time: string;
    end_time: string;
    store_name?: string;
  };
  memo?: string;
  isLocked?: boolean;
}

export class AIMatchingEngine {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (supabase) {
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('AI Matching Engine initialization failed:', error);
    }
  }

  /**
   * マッチング候補の生成
   */
  public async generateMatchCandidates(
    requests: any[],
    postings: any[],
    userProfiles?: any,
    ratings?: any[],
    storeNgPharmacies?: any,
    storeNgPharmacists?: any,
    confirmedMatches?: Set<string>
  ): Promise<MatchCandidate[]> {
    const candidates: MatchCandidate[] = [];

    try {
      const usedPharmacists = new Set<string>();
      const pharmacyUsageCount = new Map<string, number>();

      const pharmacyNeeds = new Map<string, number>();
      postings.forEach(posting => {
        const pharmacyId = posting.pharmacy_id;
        const requiredStaff = posting.required_staff || 1;
        pharmacyNeeds.set(pharmacyId, (pharmacyNeeds.get(pharmacyId) || 0) + requiredStaff);
      });

      let hasProgress = true;
      let iteration = 0;
      const maxIterations = 10;

      while (hasProgress && iteration < maxIterations) {
        hasProgress = false;
        iteration++;

        for (const request of requests) {
          if (usedPharmacists.has(request.pharmacist_id)) continue;

          for (const posting of postings) {
            const pharmacyId = posting.pharmacy_id;
            const currentUsage = pharmacyUsageCount.get(pharmacyId) || 0;
            const maxUsage = pharmacyNeeds.get(pharmacyId) || 0;

            if (confirmedMatches && confirmedMatches.size > 0) {
              const matchKey = `${request.pharmacist_id}_${request.date}_${pharmacyId}`;
              if (confirmedMatches.has(matchKey)) continue;
            }

            if (currentUsage >= maxUsage) continue;

            const dateMatch = request.date === posting.date;
            const timeCompatible = this.isBasicCompatible(request, posting);
            const ngCompatible = this.isNgCompatible(request, posting, userProfiles, storeNgPharmacies, storeNgPharmacists);

            if (dateMatch && timeCompatible && ngCompatible) {
              usedPharmacists.add(request.pharmacist_id);
              pharmacyUsageCount.set(pharmacyId, currentUsage + 1);
              hasProgress = true;

              candidates.push({
                pharmacist: {
                  id: request.pharmacist_id,
                  name: this.getPharmacistName(request, userProfiles),
                  email: userProfiles?.[request.pharmacist_id]?.email || '',
                  rating: 0,
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
                  id: posting.pharmacy_id,
                  name: this.getPharmacyName(posting, userProfiles),
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
                timeSlot: {
                  start: posting.start_time,
                  end: posting.end_time,
                  date: request.date,
                  urgency: 'medium',
                  flexibility: 0
                },
                compatibilityScore: 0.8,
                reasons: ['マッチング'],
                posting: {
                  start_time: posting.start_time,
                  end_time: posting.end_time,
                  store_name: posting.store_name || ''
                },
                memo: request.memo || ''
              });
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('generateMatchCandidates エラー:', error);
    }

    return candidates;
  }

  /**
   * 薬剤師名を取得
   */
  private getPharmacistName(request: any, userProfiles?: any): string {
    const pharmacistId = request.pharmacist_id;
    if (userProfiles && userProfiles[pharmacistId]) {
      const profile = userProfiles[pharmacistId];
      if (profile.name && profile.name.trim()) return profile.name.trim();
      if (profile.email && profile.email.trim()) return profile.email.split('@')[0];
    }
    return `薬剤師${pharmacistId ? pharmacistId.slice(-4) : 'Unknown'}`;
  }

  /**
   * 薬局名を取得
   */
  private getPharmacyName(posting: any, userProfiles?: any): string {
    const pharmacyId = posting.pharmacy_id;
    if (userProfiles && userProfiles[pharmacyId]) {
      const profile = userProfiles[pharmacyId];
      if (profile.name && profile.name.trim()) return profile.name.trim();
      if (profile.email && profile.email.trim()) return profile.email.split('@')[0];
    }
    return `薬局${pharmacyId ? pharmacyId.slice(-4) : 'Unknown'}`;
  }

  /**
   * 基本的な時間適合性チェック
   */
  private isBasicCompatible(request: any, posting: any): boolean {
    const rs = request?.start_time;
    const re = request?.end_time;
    const ps = posting?.start_time;
    const pe = posting?.end_time;

    if (!rs || !re || !ps || !pe) return false;

    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const requestStart = timeToMinutes(rs);
    const requestEnd = timeToMinutes(re);
    const postingStart = timeToMinutes(ps);
    const postingEnd = timeToMinutes(pe);

    return requestStart <= postingStart && requestEnd >= postingEnd;
  }

  /**
   * NGリストの互換性チェック
   */
  private isNgCompatible(request: any, posting: any, userProfiles?: any, storeNgPharmacies?: any, storeNgPharmacists?: any): boolean {
    if (!userProfiles) return true;

    const pharmacist = userProfiles[request.pharmacist_id];
    const pharmacy = userProfiles[posting.pharmacy_id];

    if (!pharmacist || !pharmacy) return true;

    const pharmacistNg: string[] = Array.isArray(pharmacist.ng_list) ? pharmacist.ng_list : [];
    const pharmacyNg: string[] = Array.isArray(pharmacy.ng_list) ? pharmacy.ng_list : [];

    const pharmacistNgPharmacies = storeNgPharmacies?.[request.pharmacist_id] || [];
    const pharmacyNgPharmacists = storeNgPharmacists?.[posting.pharmacy_id] || [];

    const blockedByPharmacist =
      pharmacistNgPharmacies.some((ng: any) =>
        ng.pharmacy_id === posting.pharmacy_id &&
        (!ng.store_name || ng.store_name === posting.store_name)
      ) || pharmacistNg.includes(posting.pharmacy_id);

    const blockedByPharmacy =
      pharmacyNgPharmacists.some((ng: any) =>
        ng.pharmacist_id === request.pharmacist_id
      ) || pharmacyNg.includes(request.pharmacist_id);

    return !blockedByPharmacist && !blockedByPharmacy;
  }

  /**
   * 最適なマッチングの実行
   */
  public async executeOptimalMatching(
    requests: any[],
    postings: any[],
    options?: {
      useAPI?: boolean;
      algorithm?: 'rule_based' | 'ai_based' | 'hybrid';
      priority?: 'satisfaction' | 'efficiency' | 'balance' | 'pharmacy_satisfaction';
    },
    userProfiles?: any,
    ratings?: any[],
    storeNgPharmacies?: any,
    storeNgPharmacists?: any,
    confirmedMatches?: Set<string>
  ): Promise<MatchCandidate[]> {
    try {
      // 距離ベースのマッチングを実行
      let distanceBasedMatches: any[] = [];
      if (userProfiles) {
        try {
          distanceBasedMatches = await generateDistanceBasedMatches(requests, postings, userProfiles);
        } catch (error) {
          console.warn('距離ベースマッチング失敗:', error);
        }
      }

      const candidates = await this.generateMatchCandidates(requests, postings, userProfiles, ratings, storeNgPharmacies, storeNgPharmacists, confirmedMatches);

      // 薬局の応募満足度を優先する最適化アルゴリズム
      const result = await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority, ratings);

      // 距離ベースのマッチング結果を統合
      const finalResult = [...distanceBasedMatches, ...result];

      // 重複を除去
      return finalResult.filter((match, index, self) =>
        index === self.findIndex(m =>
          m.pharmacist_id === match.pharmacist_id &&
          m.pharmacy_id === match.pharmacy_id &&
          m.date === match.date
        )
      );
    } catch (error) {
      console.error('executeOptimalMatching エラー:', error);
      return [];
    }
  }

  /**
   * 薬局の応募満足度を優先するマッチングアルゴリズム
   */
  private async executePharmacySatisfactionMatching(
    candidates: MatchCandidate[],
    requests: any[],
    postings: any[],
    priority?: string,
    ratings?: any[]
  ): Promise<MatchCandidate[]> {
    if (priority !== 'pharmacy_satisfaction') {
      return this.executeGreedyMatching(candidates);
    }

    const pharmacyNeeds = this.analyzePharmacyNeeds(postings);
    const pharmacistScores = this.calculatePharmacistScores(requests, ratings);

    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const pharmacyUsageCount = new Map<string, number>();

    const sortedPharmacies = Object.entries(pharmacyNeeds)
      .sort(([, a], [, b]) => b.priority - a.priority);

    let hasProgress = true;
    let iteration = 0;
    const maxIterations = 10;

    while (hasProgress && iteration < maxIterations) {
      hasProgress = false;
      iteration++;

      for (const [pharmacyId] of sortedPharmacies) {
        const pharmacyPostings = postings.filter(p => p.pharmacy_id === pharmacyId);

        for (const posting of pharmacyPostings) {
          const storeName = posting.store_name || 'default';
          const uniqueKey = `${pharmacyId}_${storeName}`;
          const currentUsage = pharmacyUsageCount.get(uniqueKey) || 0;
          const requiredStaff = posting.required_staff || 1;

          if (currentUsage >= requiredStaff) continue;

          const availableCandidates = candidates.filter(candidate =>
            candidate.pharmacy.id === pharmacyId &&
            candidate.pharmacy.name === storeName &&
            !usedPharmacists.has(candidate.pharmacist.id)
          );

          if (availableCandidates.length === 0) continue;

          const bestCandidate = availableCandidates.reduce((best, current) => {
            const currentScore = pharmacistScores[current.pharmacist.id] || 0;
            const bestScore = pharmacistScores[best.pharmacist.id] || 0;
            return currentScore > bestScore ? current : best;
          });

          selectedMatches.push(bestCandidate);
          usedPharmacists.add(bestCandidate.pharmacist.id);
          pharmacyUsageCount.set(uniqueKey, currentUsage + 1);
          hasProgress = true;
        }
      }
    }

    return selectedMatches;
  }

  /**
   * 薬局の需要分析
   */
  private analyzePharmacyNeeds(postings: any[]): { [pharmacyId: string]: { priority: number; count: number } } {
    const needs: { [pharmacyId: string]: { priority: number; count: number } } = {};

    postings.forEach(posting => {
      const pharmacyId = posting.pharmacy_id;
      if (!needs[pharmacyId]) {
        needs[pharmacyId] = { priority: 0, count: 0 };
      }
      const requiredStaff = posting.required_staff || 1;
      needs[pharmacyId].count += requiredStaff;
      needs[pharmacyId].priority += requiredStaff;
    });

    return needs;
  }

  /**
   * 薬剤師のスコア計算
   */
  private calculatePharmacistScores(requests: any[], ratings?: any[]): { [pharmacistId: string]: number } {
    const scores: { [pharmacistId: string]: number } = {};

    requests.forEach(request => {
      const pharmacistId = request.pharmacist_id;
      if (!scores[pharmacistId]) {
        scores[pharmacistId] = 0;
      }

      const priorityScore = request.priority === 'high' ? 3 : request.priority === 'medium' ? 2 : 1;
      scores[pharmacistId] += priorityScore;

      if (ratings && ratings.length > 0) {
        const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacistId);
        if (pharmacistRatings.length > 0) {
          const averageRating = pharmacistRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / pharmacistRatings.length;
          scores[pharmacistId] += averageRating * 2;
        }
      }
    });

    return scores;
  }

  /**
   * 貪欲法アルゴリズム
   */
  private executeGreedyMatching(candidates: MatchCandidate[]): MatchCandidate[] {
    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const usedPharmacies = new Set<string>();

    const sortedCandidates = candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    for (const candidate of sortedCandidates) {
      if (!usedPharmacists.has(candidate.pharmacist.id) &&
          !usedPharmacies.has(candidate.pharmacy.id)) {
        selectedMatches.push(candidate);
        usedPharmacists.add(candidate.pharmacist.id);
        usedPharmacies.add(candidate.pharmacy.id);
      }
    }

    return selectedMatches;
  }
}
