import { supabase } from '../../lib/supabase';

export interface MatchCandidate {
  pharmacist: {
  id: string;
  name: string;
    email: string;
  rating: number;
  preferences: {
    preferredPharmacyTypes: string[];
      maxCommuteTime: number;
    preferredTimeSlots: string[];
  };
  pastPerformance: {
    totalShifts: number;
    averageSatisfaction: number;
    completionRate: number;
    noShowRate: number;
  };
  };
  pharmacy: {
  id: string;
  name: string;
  requirements: {
    requiredSkills: string[];
      experienceLevel: string;
    specialNeeds: string[];
  };
  environment: {
      type: string;
      size: string;
    specialties: string[];
  };
  pastPerformance: {
    averagePharmacistSatisfaction: number;
    retentionRate: number;
    workEnvironment: number;
  };
  };
  timeSlot: {
  start: string;
  end: string;
  date: string;
    urgency: string;
    flexibility: number;
  };
  compatibilityScore: number;
  reasons: string[];
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
        console.log('AI Matching Engine initialized');
      }
    } catch (error) {
      console.error('AI Matching Engine initialization failed:', error);
    }
  }

  /**
   * マッチング候補の生成（シンプルなロジック）
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
    
    // デバッグ情報を収集
    let debugInfo = `=== generateMatchCandidates デバッグ ===\n`;
    debugInfo += `入力データ: 希望 ${requests.length}件, 募集 ${postings.length}件\n`;
    debugInfo += `ユーザープロフィール: ${Object.keys(userProfiles || {}).length}件\n`;
    debugInfo += `評価データ: ${(ratings || []).length}件\n\n`;
    
    // シンプルなマッチングロジック
    const candidates: MatchCandidate[] = [];

    try {
      debugInfo += `=== シンプルマッチング処理開始 ===\n`;
      
      // 重複防止のためのセット
      const usedPharmacists = new Set<string>();
      const pharmacyUsageCount = new Map<string, number>();
      
      // 薬局の募集人数を事前計算
      const pharmacyNeeds = new Map<string, number>();
      postings.forEach(posting => {
        const pharmacyId = posting.pharmacy_id;
        const requiredStaff = posting.required_staff || 1;
        pharmacyNeeds.set(pharmacyId, (pharmacyNeeds.get(pharmacyId) || 0) + requiredStaff);
      });
      
      debugInfo += `薬局募集人数: ${JSON.stringify(Object.fromEntries(pharmacyNeeds))}\n\n`;
      
      // すべての薬剤師がマッチングされるまで繰り返し処理
      let hasProgress = true;
      let iteration = 0;
      const maxIterations = 10; // 無限ループ防止

      while (hasProgress && iteration < maxIterations) {
        hasProgress = false;
        iteration++;
        debugInfo += `\n=== 候補生成反復処理 ${iteration} 回目 ===\n`;

        for (const request of requests) {
          // 既に使用済みの薬剤師はスキップ
          if (usedPharmacists.has(request.pharmacist_id)) {
            debugInfo += `薬剤師 ${request.pharmacist_id} は既に使用済み - スキップ\n`;
          continue;
        }

          debugInfo += `\n薬剤師 ${request.pharmacist_id} の希望を処理中:\n`;
          debugInfo += `  日付: ${request.date}, 時間: ${request.start_time}-${request.end_time}\n`;
          debugInfo += `  薬剤師名: ${this.getPharmacistName(request, userProfiles)}\n`;
          debugInfo += `  薬剤師名取得元: ${this.getPharmacistNameSource(request, userProfiles)}\n`;
          
          for (const posting of postings) {
            const pharmacyId = posting.pharmacy_id;
            const currentUsage = pharmacyUsageCount.get(pharmacyId) || 0;
            const maxUsage = pharmacyNeeds.get(pharmacyId) || 0;
            
            // 薬局の募集人数をチェック
            if (currentUsage >= maxUsage) {
              debugInfo += `  薬局 ${pharmacyId} は募集人数に達している (${currentUsage}/${maxUsage}) - スキップ\n`;
              continue;
            }
            
            debugInfo += `  薬局 ${posting.pharmacy_id} との組み合わせをチェック:\n`;
            debugInfo += `    日付: ${posting.date}, 時間: ${posting.start_time}-${posting.end_time}\n`;
            debugInfo += `    薬局名: ${this.getPharmacyName(posting, userProfiles)}\n`;
            debugInfo += `    取得元: ${this.getPharmacyNameSource(posting, userProfiles)}\n`;
            debugInfo += `    利用可能なフィールド:\n`;
            debugInfo += `      - posting.pharmacy_id: "${posting.pharmacy_id}"\n`;
            debugInfo += `      - posting.store_name: "${posting.store_name || 'なし'}"\n`;
            debugInfo += `      - userProfiles[${posting.pharmacy_id}]: "${userProfiles?.[posting.pharmacy_id]?.name || 'なし'}"\n`;
            debugInfo += `      - userProfiles存在: ${userProfiles ? 'あり' : 'なし'}\n`;
            
            // 基本的な条件チェック
            const dateMatch = request.date === posting.date;
            const timeCompatible = this.isBasicCompatible(request, posting);
            
            debugInfo += `    日付一致: ${dateMatch}\n`;
            debugInfo += `    時間適合: ${timeCompatible}\n`;
            
            if (dateMatch && timeCompatible) {
              debugInfo += `    → マッチング候補を作成\n`;
              
              // 重複防止の更新
              usedPharmacists.add(request.pharmacist_id);
              pharmacyUsageCount.set(pharmacyId, currentUsage + 1);
              hasProgress = true; // 進捗があった
              
              // シンプルな候補を作成
              const candidate: MatchCandidate = {
            pharmacist: {
              id: request.pharmacist_id,
                name: this.getPharmacistName(request, userProfiles),
                email: '',
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
                start: request.start_time,
                end: request.end_time,
                date: request.date,
              urgency: 'medium',
              flexibility: 0
            },
              compatibilityScore: 0.8,
              reasons: ['時間適合性マッチング']
            };
            
              candidates.push(candidate);
              debugInfo += `    → 候補追加完了\n`;
              break; // マッチしたら次の薬剤師へ
            } else {
              debugInfo += `    → 条件不一致のためスキップ\n`;
            }
          }
        }
      }
      
      debugInfo += `\n=== マッチング処理完了 ===\n`;
      debugInfo += `生成された候補: ${candidates.length}件\n`;
      
    } catch (error) {
      debugInfo += `\n=== エラー発生 ===\n`;
      debugInfo += `エラーメッセージ: ${error.message}\n`;
      debugInfo += `エラースタック: ${error.stack}\n`;
      
      console.error('generateMatchCandidates エラー:', error);
    }
    
    // デバッグ情報をコンソールに出力
    console.log(debugInfo);
    
    console.log(`シンプルマッチング完了: ${candidates.length}件の候補を生成`);
    console.log('candidates:', candidates);
    
    return candidates;
  }

  /**
   * 薬剤師名を取得（user_profilesテーブルから優先）
   */
  private getPharmacistName(request: any, userProfiles?: any): string {
    const pharmacistId = request.pharmacist_id;
    
    // AdminDashboardと同じロジック: user_profilesテーブルから取得
    if (userProfiles && userProfiles[pharmacistId]) {
      const name = userProfiles[pharmacistId]?.name;
      if (name && name.trim()) {
        return name.trim();
      }
    }
    
    // フォールバック
    return 'Unknown';
  }

  /**
   * 薬局名を取得（店舗名と薬局名の組み合わせ）
   */
  private getPharmacyName(posting: any, userProfiles?: any): string {
    const pharmacyId = posting.pharmacy_id;
    let pharmacyName = '';
    let storeName = '';
    
    // デバッグ: 利用可能なキーを確認
    console.log('=== 薬局名取得デバッグ ===');
    console.log('posting.pharmacy_id:', pharmacyId);
    console.log('posting object:', posting);
    console.log('userProfiles keys:', userProfiles ? Object.keys(userProfiles) : 'なし');
    console.log('userProfiles[pharmacyId]:', userProfiles?.[pharmacyId]);
    console.log('userProfiles type:', typeof userProfiles);
    console.log('userProfiles length:', userProfiles ? Object.keys(userProfiles).length : 0);
    
    // 全userProfilesの内容を確認
    if (userProfiles) {
      console.log('全userProfiles内容:');
      Object.keys(userProfiles).forEach(key => {
        console.log(`  ${key}: ${userProfiles[key]?.name || '名前なし'}`);
      });
      
      // 薬局IDとの一致を確認
      const matchingKeys = Object.keys(userProfiles).filter(key => key === pharmacyId);
      console.log('pharmacyIdと一致するキー:', matchingKeys);
    }
    
    // 1. 薬局名を取得（user_profilesテーブルから）
    if (userProfiles && userProfiles[pharmacyId]) {
      const profile = userProfiles[pharmacyId];
      if (profile.name && profile.name.trim()) {
        pharmacyName = profile.name.trim();
        console.log('薬局名取得成功:', pharmacyName);
      }
    } else {
      console.log('薬局名取得失敗: userProfiles[pharmacyId]が存在しません');
    }
    
    // 2. 店舗名を取得（shift_postingsテーブルのstore_nameから）
    if (posting.store_name && posting.store_name.trim()) {
      storeName = posting.store_name.trim();
    }
    
    // 3. 店舗名のみを返す（薬局名と店舗名が同じ場合は店舗名のみ）
    if (storeName) {
      return storeName;
    } else if (pharmacyName) {
      return pharmacyName;
    }
    
    // 4. フォールバック - userProfilesにデータがない場合の対処
    console.log('薬局名取得失敗 - フォールバック実行');
    console.log('pharmacyId:', pharmacyId);
    console.log('userProfiles存在:', !!userProfiles);
    console.log('userProfiles keys:', userProfiles ? Object.keys(userProfiles) : []);
    
    return `薬局${pharmacyId.slice(-4)}`;
  }

  /**
   * 薬剤師名の取得元を取得（デバッグ用）
   */
  private getPharmacistNameSource(request: any, userProfiles?: any): string {
    const pharmacistId = request.pharmacist_id;
    
    if (userProfiles && userProfiles[pharmacistId]?.name) {
      return 'user_profilesテーブル';
    }
    
    return 'フォールバック（Unknown）';
  }

  /**
   * 薬局名の取得元を取得（デバッグ用）
   */
  private getPharmacyNameSource(posting: any, userProfiles?: any): string {
    const pharmacyId = posting.pharmacy_id;
    let sources = [];
    
    // 薬局名の取得元をチェック
    if (userProfiles && userProfiles[pharmacyId]?.name) {
      sources.push('薬局名(user_profiles)');
    }
    
    // 店舗名の取得元をチェック
    if (posting.store_name && posting.store_name.trim()) {
      sources.push('店舗名(store_name)');
    }
    
    if (sources.length > 0) {
      return sources.join(' + ');
    }
    
    return 'フォールバック（ID末尾4桁）';
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

    // 時間を数値に変換（HH:MM:SS形式を分に変換）
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const requestStart = timeToMinutes(rs);
    const requestEnd = timeToMinutes(re);
    const postingStart = timeToMinutes(ps);
    const postingEnd = timeToMinutes(pe);

    console.log('時間適合性チェック:', {
      request: { start: rs, end: re, startMin: requestStart, endMin: requestEnd },
      posting: { start: ps, end: pe, startMin: postingStart, endMin: postingEnd },
      condition: `${requestStart} <= ${postingStart} && ${requestEnd} >= ${postingEnd}`,
      result: requestStart <= postingStart && requestEnd >= postingEnd
    });

    // 薬剤師が薬局の希望時間を完全に満たしているかチェック
    return requestStart <= postingStart && requestEnd >= postingEnd;
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
    ratings?: any[]
  ): Promise<MatchCandidate[]> {
    console.log('=== executeOptimalMatching START ===');
    console.log('requests:', requests);
    console.log('postings:', postings);
    console.log('options:', options);
    
    // デバッグ情報を収集
    let debugInfo = `=== executeOptimalMatching デバッグ ===\n`;
    debugInfo += `入力データ: 希望 ${requests.length}件, 募集 ${postings.length}件\n`;
    debugInfo += `オプション: ${JSON.stringify(options)}\n\n`;
    
    try {
      // ローカルマッチングを実行
      debugInfo += `=== ローカルマッチング実行 ===\n`;
    
    const candidates = await this.generateMatchCandidates(requests, postings, userProfiles, ratings);
    console.log(`生成された候補: ${candidates.length}件`);
    
    // 薬局の応募満足度を優先する最適化アルゴリズム
      const result = await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority, ratings);
    console.log('薬局満足度優先マッチング結果:', result);
      
      debugInfo += `\n=== 最終結果 ===\n`;
      debugInfo += `最終マッチング件数: ${result.length}件\n`;
      
      // デバッグ情報をアラートで表示
      alert(debugInfo);
      
    return result;
      
    } catch (error) {
      debugInfo += `\n=== エラー発生 ===\n`;
      debugInfo += `エラーメッセージ: ${error.message}\n`;
      debugInfo += `エラースタック: ${error.stack}\n`;
      
      console.error('executeOptimalMatching エラー:', error);
      alert(debugInfo);
      
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
      // 従来の貪欲法アルゴリズム
      return this.executeGreedyMatching(candidates);
    }

    console.log('薬局の応募満足度を優先したマッチングを実行');
    console.log('入力候補数:', candidates.length);

    // 薬局ごとの募集状況を分析
    const pharmacyNeeds = this.analyzePharmacyNeeds(postings);
    console.log('薬局需要分析結果:', pharmacyNeeds);
    
    // 薬剤師の評価と優先度を考慮
    const pharmacistScores = this.calculatePharmacistScores(requests, ratings);
    console.log('薬剤師スコア:', pharmacistScores);
    
    // 薬局の応募満足度を最大化するマッチング
    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const pharmacyUsageCount = new Map<string, number>();

    // 薬局の需要が高い順にソート
    const sortedPharmacies = Object.entries(pharmacyNeeds)
      .sort(([, a], [, b]) => b.priority - a.priority);

    console.log('薬局処理順序:', sortedPharmacies.map(([id, need]) => `${id}: ${need.count}人`));

    // すべての薬局が満杯になるまで繰り返し処理
    let hasProgress = true;
    let iteration = 0;
    const maxIterations = 10; // 無限ループ防止

    while (hasProgress && iteration < maxIterations) {
      hasProgress = false;
      iteration++;
      console.log(`\n=== 反復処理 ${iteration} 回目 ===`);

    for (const [pharmacyId, need] of sortedPharmacies) {
        const currentUsage = pharmacyUsageCount.get(pharmacyId) || 0;
        
        console.log(`薬局 ${pharmacyId} の処理: 現在使用 ${currentUsage}/${need.count}`);
        
        // 薬局の募集人数をチェック
        if (currentUsage >= need.count) {
          console.log(`薬局 ${pharmacyId} は募集人数に達している - スキップ`);
          continue;
        }

        // この薬局に適合する薬剤師候補を取得
        const availableCandidates = candidates.filter(candidate => 
          candidate.pharmacy.id === pharmacyId &&
          !usedPharmacists.has(candidate.pharmacist.id)
        );

        console.log(`薬局 ${pharmacyId} の利用可能候補: ${availableCandidates.length}件`);

        if (availableCandidates.length === 0) {
          console.log(`薬局 ${pharmacyId} に利用可能な候補なし - スキップ`);
          continue;
        }

        // 最も評価の高い薬剤師を選択
        const bestCandidate = availableCandidates.reduce((best, current) => {
          const currentScore = pharmacistScores[current.pharmacist.id] || 0;
          const bestScore = pharmacistScores[best.pharmacist.id] || 0;
        return currentScore > bestScore ? current : best;
      });

        console.log(`薬局 ${pharmacyId} に薬剤師 ${bestCandidate.pharmacist.id} をマッチング`);
        selectedMatches.push(bestCandidate);
        usedPharmacists.add(bestCandidate.pharmacist.id);
        pharmacyUsageCount.set(pharmacyId, currentUsage + 1);
        hasProgress = true; // 進捗があった
      }
    }

    console.log(`\n=== 最終結果 ===`);
    console.log(`処理完了: ${selectedMatches.length}件のマッチング`);
    console.log(`薬局使用状況:`, Object.fromEntries(pharmacyUsageCount));
    console.log(`薬局需要状況:`, pharmacyNeeds);

    console.log(`薬局満足度優先マッチング完了: ${selectedMatches.length}件`);
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
      // required_staffフィールドを使用（デフォルトは1）
      const requiredStaff = posting.required_staff || 1;
      needs[pharmacyId].count += requiredStaff;
      needs[pharmacyId].priority += requiredStaff;
    });
    
    console.log('薬局需要分析:', needs);
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
      
      // 1. 優先度に基づくスコア
      const priorityScore = request.priority === 'high' ? 3 : request.priority === 'medium' ? 2 : 1;
      scores[pharmacistId] += priorityScore;
      
      // 2. 評価データに基づくスコア
      if (ratings && ratings.length > 0) {
        const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacistId);
        if (pharmacistRatings.length > 0) {
          const averageRating = pharmacistRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / pharmacistRatings.length;
          scores[pharmacistId] += averageRating * 2; // 評価を2倍の重みで追加
        }
      }
      
      // 3. 過去の実績に基づくスコア（将来実装）
      // 4. 専門性に基づくスコア（将来実装）
    });
    
    console.log('薬剤師スコア計算結果:', scores);
    return scores;
  }

  /**
   * 貪欲法アルゴリズム
   */
  private executeGreedyMatching(candidates: MatchCandidate[]): MatchCandidate[] {
    const selectedMatches: MatchCandidate[] = [];
    const usedPharmacists = new Set<string>();
    const usedPharmacies = new Set<string>();

    // 互換性スコアでソート
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