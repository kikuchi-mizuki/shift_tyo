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
  private mlModel: MLModel; // 機械学習モデル
  private trainingData: any[] = [];
  private isInitialized = false;

  constructor() {
    this.mlModel = new MLModel();
    this.initializeEngine();
  }

  /**
   * エンジンの初期化
   */
  private async initializeEngine() {
    try {
      // Supabaseクライアントの存在確認
      if (!supabase) {
        console.warn('Supabase client not available, initializing in fallback mode');
        this.isInitialized = true; // フォールバックモードでも初期化完了とする
        return;
      }

      // 既存のデータから学習データを生成
      await this.loadTrainingData();
      this.isInitialized = true;
      console.log('AI Matching Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Matching Engine:', error);
      // エラーが発生してもフォールバックモードで動作させる
      this.isInitialized = true;
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
    // Supabaseクライアントの存在確認
    if (!supabase) {
      console.warn('Supabase client not available, returning empty data');
      return [];
    }

    try {
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
    } catch (error) {
      console.error('Exception in getConfirmedShifts:', error);
      return [];
    }
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
   * マッチング候補の生成（実際のシフトデータを使用）
   */
  public async generateMatchCandidates(
    requests: any[],
    postings: any[],
    userProfiles?: any,
    ratings?: any[]
  ): Promise<MatchCandidate[]> {
    console.log('=== generateMatchCandidates START ===');
    console.log('requests:', requests);
    console.log('postings:', postings);
    console.log('userProfiles:', userProfiles);
    console.log('ratings:', ratings);
    
    // 実際のシフトデータを取得
    let actualRequests = requests;
    let actualPostings = postings;
    
    console.log('=== SUPABASE CLIENT CHECK ===');
    console.log('supabase exists:', !!supabase);
    console.log('this.isInitialized:', this.isInitialized);
    console.log('Condition result:', !!(supabase && this.isInitialized));
    
    if (supabase && this.isInitialized) {
      try {
        console.log('Attempting to fetch shift_requests...');
        // 実際のシフト希望データを取得（正しいカラム名を使用）
        const { data: shiftRequests, error: requestsError } = await supabase
          .from('shift_requests')
          .select('id, pharmacist_id, date, time_slot, start_time, end_time, priority, status, memo');
        
        if (!requestsError && shiftRequests) {
          actualRequests = shiftRequests;
          console.log('Actual shift requests loaded:', actualRequests.length);
          console.log('Sample request:', actualRequests[0]);
        } else {
          console.error('Error loading shift requests:', requestsError);
          console.error('Error details:', {
            code: requestsError?.code,
            message: requestsError?.message,
            details: requestsError?.details,
            hint: requestsError?.hint
          });
        }
        
        // 実際のシフト募集データを取得（正しいカラム名を使用）
        const { data: shiftPostings, error: postingsError } = await supabase
          .from('shift_postings')
          .select('id, pharmacy_id, date, time_slot, start_time, end_time, required_staff, status, memo, store_name');
        
        if (!postingsError && shiftPostings) {
          // スキーマ差異（required_people/notes）を吸収
          actualPostings = (shiftPostings as any[]).map((p: any) => ({
            ...p,
            required_people: p.required_people ?? p.required_staff ?? 1,
            notes: p.notes ?? p.memo ?? null
          }));
          console.log('Actual shift postings loaded:', actualPostings.length);
          console.log('Sample posting:', actualPostings[0]);
        } else {
          console.error('Error loading shift postings:', postingsError);
          console.error('Error details:', {
            code: postingsError?.code,
            message: postingsError?.message,
            details: postingsError?.details,
            hint: postingsError?.hint
          });
        }
      } catch (error) {
        console.error('Error fetching actual shift data:', error);
      }
    }
    
    // データが空の場合はフォールバックを使用
    if (!actualRequests || actualRequests.length === 0 || !actualPostings || actualPostings.length === 0) {
      console.warn('No actual shift data available, using fallback');
      console.warn('actualRequests:', actualRequests?.length || 0);
      console.warn('actualPostings:', actualPostings?.length || 0);
      return this.fallbackMatching(actualRequests || [], actualPostings || []);
    }
    
    console.log('=== 実際のデータでマッチング開始 ===');
    console.log('Requests count:', actualRequests.length);
    console.log('Postings count:', actualPostings.length);

    const candidates: MatchCandidate[] = [];

    // 薬剤師を評価順にソート（実際のデータを使用）
    const sortedRequests = actualRequests.sort((a: any, b: any) => {
      const aRating = this.calculatePharmacistRating(a, ratings);
      const bRating = this.calculatePharmacistRating(b, ratings);
      
      // 評価が異なる場合は評価の高い順
      if (aRating !== bRating) {
        return bRating - aRating;
      }
      
      // 評価が同じ場合は優先度順
      const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const processedPairs = new Set<string>(); // 薬剤師-薬局-日付ペアの重複防止

    console.log('=== マッチング処理開始 ===');
    console.log('sortedRequests:', sortedRequests.length);
    console.log('actualPostings:', actualPostings.length);
    
    for (const request of sortedRequests) {
      console.log(`薬剤師 ${request.pharmacist_id} の希望を処理中:`, request);
      
      for (const posting of actualPostings) {
        // 薬剤師-薬局-日付ペアの重複チェック（同じ日付での重複のみ防止）
        const pairKey = `${request.pharmacist_id}-${posting.pharmacy_id}-${request.date}`;
        if (processedPairs.has(pairKey)) {
          console.log(`重複ペアをスキップ: ${pairKey}`);
          continue;
        }

        console.log(`薬局 ${posting.pharmacy_id} との組み合わせをチェック:`, posting);
        console.log(`日付一致: ${request.date === posting.date}`);
        console.log(`時間互換性: ${this.isBasicCompatible(request, posting)}`);
        console.log(`NG互換性: ${this.isNgCompatible(request, posting, userProfiles)}`);

        // 基本的なフィルタリング（時間範囲 + NGリスト + 日付一致）
        if (request.date === posting.date && 
            this.isBasicCompatible(request, posting) && 
            this.isNgCompatible(request, posting, userProfiles)) {
          
          console.log(`マッチング候補を作成中...`);
          const candidate = await this.createMatchCandidate(request, posting, ratings);
          if (candidate) {
            console.log(`マッチング成功:`, candidate);
            candidates.push(candidate);
            processedPairs.add(pairKey);
            break; // 同じ日付で薬剤師は1つの薬局にのみマッチ
          }
        }
      }
    }
    
    console.log('=== マッチング処理完了 ===');
    console.log(`生成された候補数: ${candidates.length}`);

    // スコア順にソート
    return candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * 基本的な互換性チェック（従来のロジックを踏襲 + 改善）
   */
  private isBasicCompatible(request: any, posting: any): boolean {
    // 時間範囲の互換性
    const rs = request?.start_time;
    const re = request?.end_time;
    const ps = posting?.start_time;
    const pe = posting?.end_time;

    if (!rs || !re || !ps || !pe) return false;

    // オーバーラップ判定: 少しでも時間が重なればマッチ
    // re > ps かつ rs < pe であれば時間帯が交差
    return re > ps && rs < pe;
  }

  /**
   * 薬局-薬剤師ペアの成功率を計算
   */
  private calculatePairSuccessRate(pharmacistId: string, pharmacyId: string, ratings?: any[]): number {
    if (!ratings) return 0.5; // デフォルト値
    
    const pairRatings = ratings.filter(r => 
      r.pharmacist_id === pharmacistId && r.pharmacy_id === pharmacyId
    );
    
    if (pairRatings.length === 0) return 0.5; // デフォルト値

    // 成功率の計算（評価3以上を成功とする）
    const successfulRatings = pairRatings.filter(r => r.rating >= 3).length;
    const successRate = successfulRatings / pairRatings.length;
    
    return successRate;
  }

  /**
   * 時間帯別の成功率を計算
   */
  private calculateTimeSlotSuccessRate(timeSlot: string, ratings?: any[]): number {
    if (!ratings) return 0.5; // デフォルト値
    
    // 時間帯の分類
    const hour = new Date(`2000-01-01T${timeSlot}`).getHours();
    let timeSlotCategory = '';
    
    if (hour >= 6 && hour < 12) timeSlotCategory = 'morning';
    else if (hour >= 12 && hour < 18) timeSlotCategory = 'afternoon';
    else if (hour >= 18 && hour < 22) timeSlotCategory = 'evening';
    else timeSlotCategory = 'night';
    
    // 該当時間帯の評価を取得（実際の実装では時間帯情報が必要）
    // 現在は簡易的に全体の平均を返す
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const successRate = averageRating / 5; // 5段階評価を0-1に正規化
    
    return Math.max(0.3, Math.min(0.9, successRate)); // 0.3-0.9の範囲に制限
  }

  /**
   * NGリストの互換性チェック
   */
  private isNgCompatible(request: any, posting: any, userProfiles: any): boolean {
    // userProfilesが取得できない場合は、NGリストチェックをスキップ
    if (!userProfiles) {
      console.log('userProfilesが取得できないため、NGリストチェックをスキップ');
      return true;
    }
    
    const pharmacist = this.getProfileById(request.pharmacist_id, userProfiles);
    const pharmacy = this.getProfileById(posting.pharmacy_id, userProfiles);
    
    // プロファイルが取得できない場合は、NGリストチェックをスキップ
    if (!pharmacist || !pharmacy) {
      console.log('プロファイルが取得できないため、NGリストチェックをスキップ');
      return true;
    }

    const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];
    const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];

    const blockedByPharmacist = pharmacistNg.includes(posting.pharmacy_id);
    const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

    console.log(`NGリストチェック: 薬剤師NG=${pharmacistNg}, 薬局NG=${pharmacyNg}`);
    console.log(`ブロック状況: 薬剤師によるブロック=${blockedByPharmacist}, 薬局によるブロック=${blockedByPharmacy}`);

    return !blockedByPharmacist && !blockedByPharmacy;
  }

  /**
   * プロファイル取得のヘルパー関数
   */
  private getProfileById(id: string, userProfiles: any): any {
    if (!userProfiles) return null;
    if (Array.isArray(userProfiles)) {
      return userProfiles.find((u: any) => u?.id === id);
    }
    return userProfiles[id];
  }

  /**
   * マッチング候補の作成（既存評価データを活用）
   */
  private async createMatchCandidate(
    request: any,
    posting: any,
    ratings?: any[]
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
        timeSlot,
        ratings
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
    if (!supabase) {
      console.warn('Supabase client not available, returning null profile');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacistId)
        .maybeSingle();

      if (error || !data) {
        console.warn('Failed to fetch pharmacist profile:', error);
        return null;
      }

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
    if (!supabase) {
      console.warn('Supabase client not available, returning null profile');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacyId)
        .maybeSingle();

      if (error || !data) {
        console.warn('Failed to fetch pharmacy profile:', error);
        return null;
      }

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
   * 互換性スコアの計算（機械学習モデル + 既存評価データを活用した改善版）
   */
  private async calculateCompatibilityScore(
    pharmacist: PharmacistProfile,
    pharmacy: PharmacyProfile,
    timeSlot: TimeSlot,
    ratings?: any[]
  ): Promise<number> {
    try {
      // 機械学習モデルからの予測を取得
      const mlPrediction = await this.mlModel.predict(
        pharmacist.id,
        pharmacy.id,
        timeSlot.start,
        timeSlot.date
      );

      // 機械学習の予測スコア (50%)
      let score = mlPrediction.successProbability * 0.5;

      // 既存評価データからの成功率 (30%)
      const pairSuccessRate = this.calculatePairSuccessRate(pharmacist.id, pharmacy.id, ratings);
      score += pairSuccessRate * 0.3;

      // 薬剤師の評価スコア (15%)
      const pharmacistRating = ratings ? this.calculatePharmacistRating({ pharmacist_id: pharmacist.id }, ratings) : 0;
      const normalizedPharmacistRating = pharmacistRating / 5; // 5段階評価を0-1に正規化
      score += normalizedPharmacistRating * 0.15;

      // 時間帯別成功率 (5%)
      const timeSlotSuccessRate = this.calculateTimeSlotSuccessRate(timeSlot.start, ratings);
      score += timeSlotSuccessRate * 0.05;

      // 機械学習の信頼度で重み付け調整
      const confidenceWeight = mlPrediction.confidence;
      const finalScore = score * confidenceWeight + score * (1 - confidenceWeight) * 0.8;

      return Math.min(finalScore, 1); // 最大1.0
    } catch (error) {
      console.error('Error in ML-based compatibility calculation, falling back to rule-based:', error);
      
      // フォールバック: 従来のルールベース計算
      let score = 0;

      // 既存評価データからの成功率 (40%)
      const pairSuccessRate = this.calculatePairSuccessRate(pharmacist.id, pharmacy.id, ratings);
      score += pairSuccessRate * 0.4;

      // 薬剤師の評価スコア (25%)
      const pharmacistRating = ratings ? this.calculatePharmacistRating({ pharmacist_id: pharmacist.id }, ratings) : 0;
      const normalizedPharmacistRating = pharmacistRating / 5;
      score += normalizedPharmacistRating * 0.25;

      // 時間帯別成功率 (15%)
      const timeSlotSuccessRate = this.calculateTimeSlotSuccessRate(timeSlot.start, ratings);
      score += timeSlotSuccessRate * 0.15;

      // スキルマッチング (10%)
      const skillScore = this.calculateSkillMatch(pharmacist.skills, pharmacy.requirements.requiredSkills);
      score += skillScore * 0.1;

      // 経験レベルマッチング (5%)
      const experienceScore = this.calculateExperienceMatch(pharmacist.experience, pharmacy.requirements.experienceLevel);
      score += experienceScore * 0.05;

      // 時間柔軟性 (5%)
      const flexibilityScore = Math.min(timeSlot.flexibility / 60, 1);
      score += flexibilityScore * 0.05;

      return Math.min(score, 1);
    }
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
    console.log('=== フォールバックマッチング開始 ===');
    console.log('requests:', requests.length);
    console.log('postings:', postings.length);
    
    const candidates: MatchCandidate[] = [];
    const processedPairs = new Set<string>(); // 重複防止

    // データが空の場合は空の配列を返す
    if (!requests || requests.length === 0 || !postings || postings.length === 0) {
      console.log('リクエストまたはポスティングが空のため、マッチングをスキップ');
      return candidates;
    }

    for (const request of requests) {
      console.log(`薬剤師 ${request.pharmacist_id} の希望を処理中:`, request);
      
      for (const posting of postings) {
        // 薬剤師-薬局-日付ペアの重複チェック
        const pairKey = `${request.pharmacist_id}-${posting.pharmacy_id}-${request.date}`;
        if (processedPairs.has(pairKey)) {
          console.log(`重複ペアをスキップ: ${pairKey}`);
          continue;
        }

        console.log(`薬局 ${posting.pharmacy_id} との組み合わせをチェック:`, posting);
        console.log(`日付一致: ${request.date === posting.date}`);
        console.log(`時間互換性: ${this.isBasicCompatible(request, posting)}`);

        // より緩い条件でマッチング（日付一致のみでもマッチング）
        const dateMatch = request.date === posting.date;
        const timeCompatible = this.isBasicCompatible(request, posting);
        
        // 日付が一致していれば、時間の互換性に関係なくマッチング
        if (dateMatch) {
          console.log(`フォールバックマッチング成功（日付一致）: ${pairKey}`);
          
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
              name: posting.store_name || 'Unknown',
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
              start: posting.start_time || request.start_time || '09:00:00',
              end: posting.end_time || request.end_time || '18:00:00',
              date: posting.date,
              urgency: 'medium',
              flexibility: 0
            },
            compatibilityScore: timeCompatible ? 0.8 : 0.6, // 時間互換性がある場合は高いスコア
            reasons: timeCompatible ? ['日付・時間一致（フォールバック）'] : ['日付一致（フォールバック）']
          });
          
          processedPairs.add(pairKey);
          break; // 同じ日付で薬剤師は1つの薬局にのみマッチ
        }
      }
    }

    console.log(`フォールバックマッチング完了: ${candidates.length}件の候補を生成`);
    console.log('candidates:', candidates);
    return candidates;
  }

  /**
   * 最適なマッチングの実行（従来のロジックを踏襲）
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
    ratings?: any[]
  ): Promise<MatchCandidate[]> {
    console.log('=== executeOptimalMatching START ===');
    console.log('requests:', requests);
    console.log('postings:', postings);
    console.log('options:', options);
    console.log('userProfiles:', userProfiles);
    console.log('ratings:', ratings);
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

    // フォールバック: ローカルマッチング（従来のロジック）
    console.log('フォールバック: ローカルマッチングを実行');
    console.log('requests length:', requests.length);
    console.log('postings length:', postings.length);
    
    const candidates = await this.generateMatchCandidates(requests, postings, userProfiles, ratings);
    console.log(`生成された候補: ${candidates.length}件`);
    console.log('candidates:', candidates);
    
    // 薬局の応募満足度を優先する最適化アルゴリズム
    const result = await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority);
    console.log('薬局満足度優先マッチング結果:', result);
    return result;
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
   * 薬剤師の評価を計算（従来のロジックを踏襲 + 改善）
   */
  private calculatePharmacistRating(request: any, ratings?: any[]): number {
    if (!ratings) return 0;
    
    const pharmacistRatings = ratings.filter(r => r.pharmacist_id === request.pharmacist_id);
    if (pharmacistRatings.length === 0) return 0;
    
    // 基本的な平均評価
    const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length;
    
    // 評価の信頼性を考慮（評価数が多いほど信頼性が高い）
    const confidenceFactor = Math.min(pharmacistRatings.length / 10, 1); // 最大1.0
    
    // 最近の評価により重みを付ける（新しい評価ほど重要）
    const recentRatings = pharmacistRatings
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5); // 最新5件
    
    const recentAverage = recentRatings.length > 0 
      ? recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length
      : average;
    
    // 重み付き平均（最近の評価70%、全体平均30%）
    const weightedAverage = recentAverage * 0.7 + average * 0.3;
    
    // 信頼性を考慮した最終スコア
    const finalScore = weightedAverage * confidenceFactor + 2.5 * (1 - confidenceFactor);
    
    return Math.round(finalScore * 10) / 10; // 小数点第1位まで
  }

  /**
   * 機械学習モデルの再学習
   */
  public async retrainModel(): Promise<void> {
    try {
      console.log('Retraining ML model...');
      await this.mlModel.retrain();
      console.log('ML model retraining completed');
    } catch (error) {
      console.error('Error retraining ML model:', error);
    }
  }

  /**
   * 機械学習モデルの状態取得
   */
  public getMLModelStatus(): { isTrained: boolean; trainingDataCount: number } {
    return this.mlModel.getModelStatus();
  }
}

// Supabaseクライアントのインポート（実際の実装では適切なパスから）
import { supabase } from '../../lib/supabase';
import { executeAIMatching as executeAIMatchingAPI, AIMatchingRequest } from './api';
import MLModel from './mlModel';

export default AIMatchingEngine;
