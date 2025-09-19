/**
 * AI Matching Engine
 * 薬剤師と薬局のマッチングをAIで最適化するシステム
 */

export interface PharmacistProfile {
  id: string;
  name: string;
  skills: string[];
  experience: number; // 年数
  rating: number;
  preferences: {
    preferredPharmacyTypes: string[];
    maxCommuteTime: number; // 分
    preferredTimeSlots: string[];
  };
  pastPerformance: {
    totalShifts: number;
    averageSatisfaction: number;
    completionRate: number;
    noShowRate: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface PharmacyProfile {
  id: string;
  name: string;
  requirements: {
    requiredSkills: string[];
    experienceLevel: 'junior' | 'intermediate' | 'senior';
    specialNeeds: string[];
  };
  environment: {
    type: 'hospital' | 'community' | 'clinic';
    size: 'small' | 'medium' | 'large';
    specialties: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  pastPerformance: {
    averagePharmacistSatisfaction: number;
    retentionRate: number;
    workEnvironment: number;
  };
}

export interface TimeSlot {
  start: string;
  end: string;
  date: string;
  urgency: 'low' | 'medium' | 'high';
  flexibility: number; // 分単位の柔軟性
}

export interface MatchCandidate {
  pharmacist: PharmacistProfile;
  pharmacy: PharmacyProfile;
  timeSlot: TimeSlot;
  compatibilityScore: number;
  reasons: string[];
}

export interface AIPrediction {
  matchScore: number;
  successProbability: number;
  satisfactionPrediction: number;
  efficiencyPrediction: number;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * AI Matching Engine Class
 */
export class AIMatchingEngine {
  private model: any; // 将来的に機械学習モデルを格納
  private trainingData: any[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeEngine();
  }

  /**
   * エンジンの初期化
   */
  private async initializeEngine() {
    try {
      // 既存のデータから学習データを生成
      await this.loadTrainingData();
      this.isInitialized = true;
      console.log('AI Matching Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Matching Engine:', error);
    }
  }

  /**
   * 学習データの読み込み
   */
  private async loadTrainingData() {
    // 既存の確定シフトから学習データを生成
    const confirmedShifts = await this.getConfirmedShifts();
    this.trainingData = confirmedShifts.map(shift => this.extractFeatures(shift));
  }

  /**
   * 確定シフトの取得
   */
  private async getConfirmedShifts() {
    // Supabaseから確定シフトを取得
    const { data, error } = await supabase
      .from('assigned_shifts')
      .select(`
        *,
        pharmacist:pharmacist_id(id, name, email),
        pharmacy:pharmacy_id(id, name, email)
      `)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching confirmed shifts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 特徴量の抽出
   */
  private extractFeatures(shift: any) {
    return {
      input: {
        pharmacistId: shift.pharmacist_id,
        pharmacyId: shift.pharmacy_id,
        timeSlot: {
          start: shift.start_time,
          end: shift.end_time,
          date: shift.date
        },
        context: {
          season: this.getSeason(shift.date),
          dayOfWeek: new Date(shift.date).getDay(),
          isHoliday: this.isHoliday(shift.date)
        }
      },
      output: {
        success: true, // 確定シフトなので成功
        satisfaction: shift.satisfaction_score || 0,
        efficiency: shift.efficiency_score || 0
      }
    };
  }

  /**
   * 季節の取得
   */
  private getSeason(date: string): string {
    const month = new Date(date).getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * 祝日の判定
   */
  private isHoliday(date: string): boolean {
    // 簡易的な祝日判定（実際の実装ではより詳細な判定が必要）
    const month = new Date(date).getMonth();
    const day = new Date(date).getDate();
    
    // 主要な祝日
    const holidays = [
      { month: 0, day: 1 },   // 元日
      { month: 1, day: 11 },  // 建国記念の日
      { month: 3, day: 29 },  // 昭和の日
      { month: 4, day: 3 },   // 憲法記念日
      { month: 4, day: 4 },   // みどりの日
      { month: 4, day: 5 },   // こどもの日
    ];
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day);
  }

  /**
   * マッチング候補の生成
   */
  public async generateMatchCandidates(
    requests: any[],
    postings: any[]
  ): Promise<MatchCandidate[]> {
    if (!this.isInitialized) {
      console.warn('AI Matching Engine not initialized, using fallback');
      return this.fallbackMatching(requests, postings);
    }

    const candidates: MatchCandidate[] = [];

    for (const request of requests) {
      for (const posting of postings) {
        // 基本的なフィルタリング
        if (this.isBasicCompatible(request, posting)) {
          const candidate = await this.createMatchCandidate(request, posting);
          if (candidate) {
            candidates.push(candidate);
          }
        }
      }
    }

    // スコア順にソート
    return candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * 基本的な互換性チェック
   */
  private isBasicCompatible(request: any, posting: any): boolean {
    // 時間範囲の互換性
    const rs = request?.start_time;
    const re = request?.end_time;
    const ps = posting?.start_time;
    const pe = posting?.end_time;

    if (!rs || !re || !ps || !pe) return false;

    // 重複関係: 薬剤師の希望時間が薬局の募集時間と重複していればマッチ
    // つまり、薬剤師が薬局の応募時間を満たしていればマッチ
    return rs < pe && re > ps;
  }

  /**
   * マッチング候補の作成
   */
  private async createMatchCandidate(
    request: any,
    posting: any
  ): Promise<MatchCandidate | null> {
    try {
      const pharmacist = await this.getPharmacistProfile(request.pharmacist_id);
      const pharmacy = await this.getPharmacyProfile(posting.pharmacy_id);

      if (!pharmacist || !pharmacy) return null;

      const timeSlot: TimeSlot = {
        start: posting.start_time,
        end: posting.end_time,
        date: posting.date,
        urgency: this.calculateUrgency(posting),
        flexibility: this.calculateFlexibility(request, posting)
      };

      const compatibilityScore = await this.calculateCompatibilityScore(
        pharmacist,
        pharmacy,
        timeSlot
      );

      const reasons = this.generateCompatibilityReasons(
        pharmacist,
        pharmacy,
        timeSlot,
        compatibilityScore
      );

      return {
        pharmacist,
        pharmacy,
        timeSlot,
        compatibilityScore,
        reasons
      };
    } catch (error) {
      console.error('Error creating match candidate:', error);
      return null;
    }
  }

  /**
   * 薬剤師プロファイルの取得
   */
  private async getPharmacistProfile(pharmacistId: string): Promise<PharmacistProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacistId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name || data.email,
        skills: data.skills || [],
        experience: data.experience || 0,
        rating: data.rating || 0,
        preferences: {
          preferredPharmacyTypes: data.preferred_pharmacy_types || [],
          maxCommuteTime: data.max_commute_time || 60,
          preferredTimeSlots: data.preferred_time_slots || []
        },
        pastPerformance: {
          totalShifts: data.total_shifts || 0,
          averageSatisfaction: data.average_satisfaction || 0,
          completionRate: data.completion_rate || 1.0,
          noShowRate: data.no_show_rate || 0
        }
      };
    } catch (error) {
      console.error('Error fetching pharmacist profile:', error);
      return null;
    }
  }

  /**
   * 薬局プロファイルの取得
   */
  private async getPharmacyProfile(pharmacyId: string): Promise<PharmacyProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacyId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name || data.email,
        requirements: {
          requiredSkills: data.required_skills || [],
          experienceLevel: data.experience_level || 'intermediate',
          specialNeeds: data.special_needs || []
        },
        environment: {
          type: data.pharmacy_type || 'community',
          size: data.pharmacy_size || 'medium',
          specialties: data.specialties || []
        },
        pastPerformance: {
          averagePharmacistSatisfaction: data.average_pharmacist_satisfaction || 0,
          retentionRate: data.retention_rate || 1.0,
          workEnvironment: data.work_environment || 0
        }
      };
    } catch (error) {
      console.error('Error fetching pharmacy profile:', error);
      return null;
    }
  }

  /**
   * 緊急度の計算
   */
  private calculateUrgency(posting: any): 'low' | 'medium' | 'high' {
    const requiredStaff = Number(posting.required_staff) || 0;
    if (requiredStaff >= 3) return 'high';
    if (requiredStaff >= 2) return 'medium';
    return 'low';
  }

  /**
   * 柔軟性の計算
   */
  private calculateFlexibility(request: any, posting: any): number {
    const requestDuration = this.getTimeDuration(request.start_time, request.end_time);
    const postingDuration = this.getTimeDuration(posting.start_time, posting.end_time);
    
    // 薬剤師の希望時間が薬局の募集時間より長い場合、余裕がある
    return Math.max(0, requestDuration - postingDuration);
  }

  /**
   * 時間の長さを分単位で取得
   */
  private getTimeDuration(start: string, end: string): number {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  }

  /**
   * 互換性スコアの計算
   */
  private async calculateCompatibilityScore(
    pharmacist: PharmacistProfile,
    pharmacy: PharmacyProfile,
    timeSlot: TimeSlot
  ): Promise<number> {
    let score = 0;

    // スキルマッチング (30%)
    const skillScore = this.calculateSkillMatch(pharmacist.skills, pharmacy.requirements.requiredSkills);
    score += skillScore * 0.3;

    // 経験レベルマッチング (20%)
    const experienceScore = this.calculateExperienceMatch(pharmacist.experience, pharmacy.requirements.experienceLevel);
    score += experienceScore * 0.2;

    // 時間柔軟性 (20%)
    const flexibilityScore = Math.min(timeSlot.flexibility / 60, 1); // 最大1時間の柔軟性
    score += flexibilityScore * 0.2;

    // 過去の実績 (15%)
    const performanceScore = (pharmacist.pastPerformance.averageSatisfaction + pharmacy.pastPerformance.averagePharmacistSatisfaction) / 2;
    score += performanceScore * 0.15;

    // 緊急度対応 (15%)
    const urgencyScore = timeSlot.urgency === 'high' ? 1 : timeSlot.urgency === 'medium' ? 0.7 : 0.5;
    score += urgencyScore * 0.15;

    return Math.min(score, 1); // 最大1.0
  }

  /**
   * スキルマッチングの計算
   */
  private calculateSkillMatch(pharmacistSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 1;
    
    const matchedSkills = requiredSkills.filter(skill => pharmacistSkills.includes(skill));
    return matchedSkills.length / requiredSkills.length;
  }

  /**
   * 経験レベルマッチングの計算
   */
  private calculateExperienceMatch(experience: number, requiredLevel: string): number {
    const levelThresholds = {
      junior: 0,
      intermediate: 2,
      senior: 5
    };

    const threshold = levelThresholds[requiredLevel];
    if (experience >= threshold) return 1;
    if (experience >= threshold * 0.7) return 0.7;
    return 0.3;
  }

  /**
   * 互換性の理由を生成
   */
  private generateCompatibilityReasons(
    pharmacist: PharmacistProfile,
    pharmacy: PharmacyProfile,
    timeSlot: TimeSlot,
    score: number
  ): string[] {
    const reasons: string[] = [];

    if (score > 0.8) {
      reasons.push('高適合度マッチ');
    } else if (score > 0.6) {
      reasons.push('良好なマッチ');
    } else if (score > 0.4) {
      reasons.push('標準的なマッチ');
    } else {
      reasons.push('条件付きマッチ');
    }

    // スキルマッチング
    const skillMatch = this.calculateSkillMatch(pharmacist.skills, pharmacy.requirements.requiredSkills);
    if (skillMatch > 0.8) {
      reasons.push('スキル完全一致');
    } else if (skillMatch > 0.5) {
      reasons.push('スキル部分一致');
    }

    // 時間柔軟性
    if (timeSlot.flexibility > 30) {
      reasons.push('時間に余裕あり');
    }

    // 緊急度対応
    if (timeSlot.urgency === 'high') {
      reasons.push('緊急対応');
    }

    return reasons;
  }

  /**
   * フォールバックマッチング（AI未初期化時）
   */
  private fallbackMatching(requests: any[], postings: any[]): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    for (const request of requests) {
      for (const posting of postings) {
        if (this.isBasicCompatible(request, posting)) {
          candidates.push({
            pharmacist: {
              id: request.pharmacist_id,
              name: 'Unknown',
              skills: [],
              experience: 0,
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
              name: 'Unknown',
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
              date: posting.date,
              urgency: 'medium',
              flexibility: 0
            },
            compatibilityScore: 0.5, // デフォルトスコア
            reasons: ['基本互換性']
          });
        }
      }
    }

    return candidates;
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
    }
  ): Promise<MatchCandidate[]> {
    // APIを使用する場合はAPI経由でマッチングを実行
    if (options?.useAPI !== false) {
      try {
        const apiRequest: AIMatchingRequest = {
          date: requests[0]?.date || postings[0]?.date || new Date().toISOString().split('T')[0],
          requests,
          postings,
          options: {
            useAI: options?.algorithm !== 'rule_based',
            algorithm: options?.algorithm || 'hybrid',
            priority: options?.priority || 'balance'
          }
        };

        const apiResponse = await executeAIMatchingAPI(apiRequest);
        
        if (apiResponse.success) {
          // APIレスポンスをMatchCandidate形式に変換
          const candidates: MatchCandidate[] = apiResponse.matches.map(match => ({
            pharmacist: {
              id: match.pharmacist_id,
              name: 'Unknown', // 実際の実装では名前を取得
              skills: [],
              experience: 0,
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
              id: match.pharmacy_id,
              name: match.store_name || 'Unknown',
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
              start: match.start_time,
              end: match.end_time,
              date: match.date,
              urgency: 'medium',
              flexibility: 0
            },
            compatibilityScore: match.compatibility_score || 0.5,
            reasons: ['API Matching']
          }));

          console.log(`API Matching completed: ${candidates.length} matches found`);
          return candidates;
        }
      } catch (error) {
        console.error('API Matching failed, falling back to local matching:', error);
      }
    }

    // フォールバック: ローカルマッチング
    const candidates = await this.generateMatchCandidates(requests, postings);
    
    // 薬局の応募満足度を優先する最適化アルゴリズム
    return await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority);
  }

  /**
   * 薬局の応募満足度を優先するマッチングアルゴリズム
   */
  private async executePharmacySatisfactionMatching(
    candidates: MatchCandidate[],
    requests: any[],
    postings: any[],
    priority?: string
  ): Promise<MatchCandidate[]> {
    if (priority !== 'pharmacy_satisfaction') {
      // 従来の貪欲法アルゴリズム
      return this.executeGreedyMatching(candidates);
    }

    console.log('薬局の応募満足度を優先したマッチングを実行');

    // 薬局ごとの募集状況を分析
    const pharmacyNeeds = this.analyzePharmacyNeeds(postings);
    
    // 薬剤師の評価と優先度を考慮
    const pharmacistScores = this.calculatePharmacistScores(requests);
    
    // 薬局の応募満足度を最大化するマッチング
    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const usedPharmacies = new Set<string>();

    // 薬局の需要が高い順にソート
    const sortedPharmacies = Object.entries(pharmacyNeeds)
      .sort(([, a], [, b]) => b.priority - a.priority);

    for (const [pharmacyId, need] of sortedPharmacies) {
      if (usedPharmacies.has(pharmacyId)) continue;

      // この薬局に対する候補を取得
      const pharmacyCandidates = candidates.filter(c => 
        c.pharmacy.id === pharmacyId && 
        !usedPharmacists.has(c.pharmacist.id)
      );

      if (pharmacyCandidates.length === 0) continue;

      // 薬剤師の評価と適合度を考慮して最適な候補を選択
      const bestCandidate = pharmacyCandidates.reduce((best, current) => {
        const currentScore = this.calculatePharmacySatisfactionScore(current, pharmacistScores);
        const bestScore = this.calculatePharmacySatisfactionScore(best, pharmacistScores);
        return currentScore > bestScore ? current : best;
      });

      if (bestCandidate.compatibilityScore > 0.3) {
        selectedMatches.push(bestCandidate);
        usedPharmacists.add(bestCandidate.pharmacist.id);
        usedPharmacies.add(bestCandidate.pharmacy.id);
      }
    }

    // 残りの薬剤師と薬局で従来のマッチングを実行
    const remainingCandidates = candidates.filter(c => 
      !usedPharmacists.has(c.pharmacist.id) && !usedPharmacies.has(c.pharmacy.id)
    );

    const remainingMatches = this.executeGreedyMatching(remainingCandidates);
    selectedMatches.push(...remainingMatches);

    console.log(`薬局応募満足度優先マッチング完了: ${selectedMatches.length}件`);
    return selectedMatches;
  }

  /**
   * 薬局の需要を分析
   */
  private analyzePharmacyNeeds(postings: any[]): { [pharmacyId: string]: { count: number; priority: number } } {
    const needs: { [pharmacyId: string]: { count: number; priority: number } } = {};
    
    for (const posting of postings) {
      const pharmacyId = posting.pharmacy_id;
      if (!needs[pharmacyId]) {
        needs[pharmacyId] = { count: 0, priority: 0 };
      }
      needs[pharmacyId].count++;
      
      // 優先度の計算（緊急度、過去の実績など）
      needs[pharmacyId].priority += this.calculatePostingPriority(posting);
    }
    
    return needs;
  }

  /**
   * 薬剤師のスコアを計算
   */
  private calculatePharmacistScores(requests: any[]): { [pharmacistId: string]: number } {
    const scores: { [pharmacistId: string]: number } = {};
    
    for (const request of requests) {
      const pharmacistId = request.pharmacist_id;
      // 評価、経験、過去の実績などを考慮したスコア
      scores[pharmacistId] = this.calculatePharmacistRating(request);
    }
    
    return scores;
  }

  /**
   * 薬局満足度スコアを計算
   */
  private calculatePharmacySatisfactionScore(
    candidate: MatchCandidate,
    pharmacistScores: { [pharmacistId: string]: number }
  ): number {
    const baseScore = candidate.compatibilityScore;
    const pharmacistScore = pharmacistScores[candidate.pharmacist.id] || 0;
    
    // 薬剤師の評価を重視（70%）、適合度を重視（30%）
    return baseScore * 0.3 + pharmacistScore * 0.7;
  }

  /**
   * 従来の貪欲法マッチング
   */
  private executeGreedyMatching(candidates: MatchCandidate[]): MatchCandidate[] {
    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const usedPharmacies = new Set<string>();

    // 適合度順にソート
    const sortedCandidates = candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    for (const candidate of sortedCandidates) {
      if (
        !usedPharmacists.has(candidate.pharmacist.id) &&
        !usedPharmacies.has(candidate.pharmacy.id) &&
        candidate.compatibilityScore > 0.3
      ) {
        selectedMatches.push(candidate);
        usedPharmacists.add(candidate.pharmacist.id);
        usedPharmacies.add(candidate.pharmacy.id);
      }
    }

    return selectedMatches;
  }

  /**
   * 募集の優先度を計算
   */
  private calculatePostingPriority(posting: any): number {
    let priority = 1;
    
    // 緊急度による優先度調整
    if (posting.urgency === 'high') priority += 2;
    else if (posting.urgency === 'medium') priority += 1;
    
    // 過去の実績による優先度調整
    // 実装は簡略化
    
    return priority;
  }

  /**
   * 薬剤師の評価を計算
   */
  private calculatePharmacistRating(request: any): number {
    // 実際の実装では、評価、経験、過去の実績などを考慮
    return Math.random() * 0.5 + 0.5; // 0.5-1.0の範囲
  }
}

// Supabaseクライアントのインポート（実際の実装では適切なパスから）
import { supabase } from '../../lib/supabase';
import { executeAIMatching as executeAIMatchingAPI, AIMatchingRequest } from './api';

export default AIMatchingEngine;
