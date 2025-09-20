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
      
      for (const request of requests) {
        debugInfo += `\n薬剤師 ${request.pharmacist_id} の希望を処理中:\n`;
        debugInfo += `  日付: ${request.date}, 時間: ${request.start_time}-${request.end_time}\n`;
        debugInfo += `  薬剤師名: ${this.getPharmacistName(request, userProfiles)}\n`;
        debugInfo += `  薬剤師名取得元: ${this.getPharmacistNameSource(request, userProfiles)}\n`;
        
        for (const posting of postings) {
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
              reasons: ['シンプルマッチング']
            };
            
            candidates.push(candidate);
            debugInfo += `    → 候補追加完了\n`;
            break; // 同じ日付で薬剤師は1つの薬局にのみマッチ
          } else {
            debugInfo += `    → 条件不一致のためスキップ\n`;
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
    
    // デバッグ情報をアラートで表示
    alert(debugInfo);
    
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
    console.log('userProfiles keys:', userProfiles ? Object.keys(userProfiles) : 'なし');
    console.log('userProfiles[pharmacyId]:', userProfiles?.[pharmacyId]);
    
    // 全userProfilesの内容を確認
    if (userProfiles) {
      console.log('全userProfiles内容:');
      Object.keys(userProfiles).forEach(key => {
        console.log(`  ${key}: ${userProfiles[key]?.name || '名前なし'}`);
      });
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
    
    // 3. 組み合わせて表示
    if (pharmacyName && storeName) {
      return `${pharmacyName}(${storeName})`;
    } else if (pharmacyName) {
      return pharmacyName;
    } else if (storeName) {
      return storeName;
    }
    
    // 4. フォールバック
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

    // 薬剤師が薬局の希望時間を完全に満たしているかチェック
    return rs <= ps && re >= pe;
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
      const result = await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority);
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

      // この薬局に適合する薬剤師候補を取得
      const availableCandidates = candidates.filter(candidate => 
        candidate.pharmacy.id === pharmacyId &&
        !usedPharmacists.has(candidate.pharmacist.id) &&
        !usedPharmacies.has(candidate.pharmacy.id)
      );

      if (availableCandidates.length === 0) continue;

      // 最も評価の高い薬剤師を選択
      const bestCandidate = availableCandidates.reduce((best, current) => {
        const currentScore = pharmacistScores[current.pharmacist.id] || 0;
        const bestScore = pharmacistScores[best.pharmacist.id] || 0;
        return currentScore > bestScore ? current : best;
      });

      selectedMatches.push(bestCandidate);
      usedPharmacists.add(bestCandidate.pharmacist.id);
      usedPharmacies.add(bestCandidate.pharmacy.id);
    }

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
      needs[pharmacyId].count++;
      needs[pharmacyId].priority += posting.required_staff || 1;
    });
    
    return needs;
  }

  /**
   * 薬剤師のスコア計算
   */
  private calculatePharmacistScores(requests: any[]): { [pharmacistId: string]: number } {
    const scores: { [pharmacistId: string]: number } = {};
    
    requests.forEach(request => {
      const pharmacistId = request.pharmacist_id;
      if (!scores[pharmacistId]) {
        scores[pharmacistId] = 0;
      }
      
      // 優先度に基づくスコア
      const priorityScore = request.priority === 'high' ? 3 : request.priority === 'medium' ? 2 : 1;
      scores[pharmacistId] += priorityScore;
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