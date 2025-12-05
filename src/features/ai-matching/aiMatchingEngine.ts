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
  // 追加のプロパティ（簡易マッチングで使用）
  posting?: {
    start_time: string;
    end_time: string;
  };
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
   * マッチング候補の生成（シンプルなロジック）
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
            
            // 確定済みマッチングをチェック
            if (confirmedMatches && confirmedMatches.size > 0) {
              const matchKey = `${request.pharmacist_id}_${request.date}_${pharmacyId}`;
              if (confirmedMatches.has(matchKey)) {
                debugInfo += `  薬剤師 ${request.pharmacist_id} + 薬局 ${pharmacyId} + 日付 ${request.date} は既に確定済み - スキップ\n`;
                continue;
              }
            }
            
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
            
            // NGリストチェック
            const ngCompatible = this.isNgCompatible(request, posting, userProfiles, storeNgPharmacies, storeNgPharmacists);
            
            debugInfo += `    日付一致: ${dateMatch}\n`;
            debugInfo += `    時間適合: ${timeCompatible}\n`;
            debugInfo += `    NG適合: ${ngCompatible}\n`;
            
            if (dateMatch && timeCompatible && ngCompatible) {
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
                start: posting.start_time, // 薬局の募集時間を使用
                end: posting.end_time, // 薬局の募集時間を使用
                date: request.date,
              urgency: 'medium',
              flexibility: 0
            },
            // デバッグ: AIマッチングエンジンでのtimeSlot設定を確認
            debugAITimeSlot: {
              postingStart: posting.start_time,
              postingEnd: posting.end_time,
              requestStart: request.start_time,
              requestEnd: request.end_time,
              timeSlotStart: posting.start_time,
              timeSlotEnd: posting.end_time
            },
            // デバッグ: 詳細なpostingとrequestの情報を確認
            debugDetailedInfo: {
              posting: {
                id: posting.id,
                pharmacy_id: posting.pharmacy_id,
                start_time: posting.start_time,
                end_time: posting.end_time,
                date: posting.date,
                store_name: posting.store_name
              },
              request: {
                id: request.id,
                pharmacist_id: request.pharmacist_id,
                start_time: request.start_time,
                end_time: request.end_time,
                date: request.date
              }
            },
              compatibilityScore: 0.8,
              reasons: ['マッチング'],
              // 店舗名を含むposting情報を追加
              posting: {
                start_time: posting.start_time,
                end_time: posting.end_time,
                store_name: posting.store_name || ''
              }
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
      debugInfo += `エラーメッセージ: ${error instanceof Error ? error.message : String(error)}\n`;
      debugInfo += `エラースタック: ${error instanceof Error ? error.stack : 'N/A'}\n`;
      
      console.error('generateMatchCandidates エラー:', error);
    }

    return candidates;
  }

  /**
   * 薬剤師名を取得（user_profilesテーブルから優先）
   */
  private getPharmacistName(request: any, userProfiles?: any): string {
    const pharmacistId = request.pharmacist_id;

    // デバッグ情報を出力
    console.error('[AI Matching Debug] getPharmacistName:', {
      pharmacistId,
      hasUserProfiles: !!userProfiles,
      userProfilesKeys: userProfiles ? Object.keys(userProfiles).length : 0,
      hasProfile: !!(userProfiles && userProfiles[pharmacistId]),
      profile: userProfiles?.[pharmacistId]
    });

    // AdminDashboardと同じロジック: user_profilesテーブルから取得
    if (userProfiles && userProfiles[pharmacistId]) {
      const profile = userProfiles[pharmacistId];
      if (profile.name && profile.name.trim()) {
        console.error('[AI Matching Debug] Using profile.name:', profile.name);
        return profile.name.trim();
      }
      // 名前がない場合はemailを使用
      if (profile.email && profile.email.trim()) {
        console.error('[AI Matching Debug] Using profile.email:', profile.email);
        return profile.email.split('@')[0]; // emailの@より前の部分を使用
      }
    }

    // フォールバック: IDの末尾4桁を使用
    const fallbackName = `薬剤師${pharmacistId ? pharmacistId.slice(-4) : 'Unknown'}`;
    console.error('[AI Matching Debug] Using fallback:', fallbackName);
    return fallbackName;
  }

  /**
   * 薬局名を取得（店舗名と薬局名の組み合わせ）
   */
  private getPharmacyName(posting: any, userProfiles?: any): string {
    const pharmacyId = posting.pharmacy_id;
    let pharmacyName = '';

    // デバッグ情報を出力
    console.error('[AI Matching Debug] getPharmacyName:', {
      pharmacyId,
      hasUserProfiles: !!userProfiles,
      userProfilesKeys: userProfiles ? Object.keys(userProfiles).length : 0,
      hasProfile: !!(userProfiles && userProfiles[pharmacyId]),
      profile: userProfiles?.[pharmacyId],
      storeName: posting.store_name
    });

    // 1. 薬局名を取得（user_profilesテーブルから）
    if (userProfiles && userProfiles[pharmacyId]) {
      const profile = userProfiles[pharmacyId];
      if (profile.name && profile.name.trim()) {
        pharmacyName = profile.name.trim();
        console.error('[AI Matching Debug] Using profile.name:', pharmacyName);
      } else if (profile.email && profile.email.trim()) {
        // 名前がない場合はemailを使用
        pharmacyName = profile.email.split('@')[0];
        console.error('[AI Matching Debug] Using profile.email:', pharmacyName);
      }
    }

    // 2. 店舗名を取得（shift_postingsテーブルのstore_nameから）
    // 注意: pharmacy.nameには薬局名を設定し、店舗名は別途使用する
    if (pharmacyName) {
      return pharmacyName;
    }

    // 3. フォールバック - userProfilesにデータがない場合の対処
    const fallbackName = `薬局${pharmacyId ? pharmacyId.slice(-4) : 'Unknown'}`;
    console.error('[AI Matching Debug] Using fallback:', fallbackName);
    return fallbackName;
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
    const sources = [];
    
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

    // 薬剤師が薬局の希望時間を完全に満たしているかチェック
    const canCoverPharmacyTime = requestStart <= postingStart && requestEnd >= postingEnd;

    console.log('時間適合性チェック:', {
      request: { start: rs, end: re, startMin: requestStart, endMin: requestEnd },
      posting: { start: ps, end: pe, startMin: postingStart, endMin: postingEnd },
      condition: `${requestStart} <= ${postingStart} && ${requestEnd} >= ${postingEnd}`,
      result: canCoverPharmacyTime,
      coverageDetails: {
        requestStart,
        requestEnd,
        postingStart,
        postingEnd,
        canCoverStart: requestStart <= postingStart,
        canCoverEnd: requestEnd >= postingEnd,
        coverageDuration: postingEnd - postingStart
      }
    });

    return canCoverPharmacyTime;
  }

  /**
   * NGリストの互換性チェック
   * 薬剤師と薬局のNGリストを確認して、マッチング可能かチェック
   */
  private isNgCompatible(request: any, posting: any, userProfiles?: any, storeNgPharmacies?: any, storeNgPharmacists?: any): boolean {
    if (!userProfiles) return true; // userProfilesがない場合は互換性ありとする

    const pharmacist = userProfiles[request.pharmacist_id];
    const pharmacy = userProfiles[posting.pharmacy_id];

    if (!pharmacist || !pharmacy) return true; // プロファイルがない場合は互換性ありとする

    // 薬剤師のNGリスト（user_profiles.ng_list）
    const pharmacistNg: string[] = Array.isArray(pharmacist.ng_list) ? pharmacist.ng_list : [];
    // 薬局のNGリスト（user_profiles.ng_list）
    const pharmacyNg: string[] = Array.isArray(pharmacy.ng_list) ? pharmacy.ng_list : [];

    // store_ng_pharmaciesテーブルから薬剤師のNG薬局・店舗リストを取得
    const pharmacistNgPharmacies = storeNgPharmacies?.[request.pharmacist_id] || [];
    // store_ng_pharmacistsテーブルから薬局のNG薬剤師リストを取得
    const pharmacyNgPharmacists = storeNgPharmacists?.[posting.pharmacy_id] || [];
    
    // デバッグログ
    console.log(`=== AIマッチングエンジン NGリストチェック ===`);
    console.log(`薬剤師ID: ${request.pharmacist_id}, 薬局ID: ${posting.pharmacy_id}`);
    console.log(`薬剤師NG薬局リスト:`, pharmacistNgPharmacies);
    console.log(`薬局NG薬剤師リスト:`, pharmacyNgPharmacists);
    console.log(`storeNgPharmacies全体:`, storeNgPharmacies);
    console.log(`storeNgPharmacists全体:`, storeNgPharmacists);

    // 薬剤師が薬局をNGにしているかチェック（新しいテーブル + 旧ng_list）
    const blockedByPharmacistNew = pharmacistNgPharmacies.some((ngPharmacy: any) => 
      ngPharmacy.pharmacy_id === posting.pharmacy_id && 
      (ngPharmacy.store_name === posting.store_name || ngPharmacy.store_name === null)
    );
    const blockedByPharmacistOld = pharmacistNg.includes(posting.pharmacy_id);
    const blockedByPharmacist = blockedByPharmacistNew || blockedByPharmacistOld;

    // 薬局が薬剤師をNGにしているかチェック（新しいテーブル + 旧ng_list）
    const blockedByPharmacyNew = pharmacyNgPharmacists.some((ngPharmacist: any) => 
      ngPharmacist.pharmacist_id === request.pharmacist_id
    );
    const blockedByPharmacyOld = pharmacyNg.includes(request.pharmacist_id);
    const blockedByPharmacy = blockedByPharmacyNew || blockedByPharmacyOld;

    // どちらかがNGにしている場合は互換性なし
    const isCompatible = !blockedByPharmacist && !blockedByPharmacy;

    if (!isCompatible) {
      console.log(`❌ NGリストによりマッチング不可: 薬剤師(${pharmacist.name || request.pharmacist_id}) ↔ 薬局(${pharmacy.name || posting.pharmacy_id})`);
      if (blockedByPharmacist) {
        console.log(`  - 薬剤師のNGリストに薬局が含まれています`);
        if (blockedByPharmacistNew) {
          console.log(`    - store_ng_pharmaciesテーブル:`, pharmacistNgPharmacies);
        }
        if (blockedByPharmacistOld) {
          console.log(`    - user_profiles.ng_list:`, pharmacistNg);
        }
      }
      if (blockedByPharmacy) {
        console.log(`  - 薬局のNGリストに薬剤師が含まれています`);
        if (blockedByPharmacyNew) {
          console.log(`    - store_ng_pharmacistsテーブル:`, pharmacyNgPharmacists);
        }
        if (blockedByPharmacyOld) {
          console.log(`    - user_profiles.ng_list:`, pharmacyNg);
        }
      }
    }

    return isCompatible;
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
    
      // 距離ベースのマッチングを実行
      let distanceBasedMatches: any[] = [];
      console.log(`🔍 userProfiles確認:`, userProfiles ? `存在 (${Object.keys(userProfiles).length}件)` : '存在しない');
      if (userProfiles) {
        try {
          debugInfo += `=== 距離ベースマッチング実行 ===\n`;
          console.log(`🎯 距離ベースマッチング開始: 希望${requests.length}件, 募集${postings.length}件`);
          
          // 薬剤師プロフィールの詳細をデバッグ情報に追加
          const profileDetails = Object.keys(userProfiles).map(id => ({
            id,
            name: userProfiles[id]?.name,
            nearest_station_name: userProfiles[id]?.nearest_station_name,
            location_latitude: userProfiles[id]?.location_latitude,
            location_longitude: userProfiles[id]?.location_longitude
          }));
          debugInfo += `薬剤師プロフィール詳細:\n`;
          profileDetails.forEach(profile => {
            debugInfo += `  - ${profile.name}: 駅=${profile.nearest_station_name || 'なし'}, 緯度=${profile.location_latitude || 'なし'}, 経度=${profile.location_longitude || 'なし'}\n`;
          });
          
          distanceBasedMatches = await generateDistanceBasedMatches(requests, postings, userProfiles);
          debugInfo += `距離ベースマッチング結果: ${distanceBasedMatches.length}件\n`;
          console.log(`✅ 距離ベースマッチング完了: ${distanceBasedMatches.length}件`);
          
          // 距離ベースマッチングの結果をデバッグ情報に追加
          if (distanceBasedMatches.length > 0) {
            debugInfo += `距離ベースマッチング詳細:\n`;
            distanceBasedMatches.forEach((match, index) => {
              debugInfo += `  ${index + 1}. 薬剤師: ${match.pharmacist_id}, 薬局: ${match.pharmacy_id}, スコア: ${match.score}\n`;
            });
          }
        } catch (error) {
          debugInfo += `距離ベースマッチングエラー: ${error}\n`;
          console.warn('❌ 距離ベースマッチング失敗:', error);
        }
      } else {
        console.log('⚠️ userProfilesが存在しないため、距離ベースマッチングをスキップ');
        debugInfo += `userProfilesが存在しないため、距離ベースマッチングをスキップ\n`;
      }
    
    const candidates = await this.generateMatchCandidates(requests, postings, userProfiles, ratings, storeNgPharmacies, storeNgPharmacists, confirmedMatches);
    console.log(`生成された候補: ${candidates.length}件`);
    
    // 薬局の応募満足度を優先する最適化アルゴリズム
      const result = await this.executePharmacySatisfactionMatching(candidates, requests, postings, options?.priority, ratings);
    console.log('薬局満足度優先マッチング結果:', result);
    
    // 距離ベースのマッチング結果を統合
    const finalResult = [...distanceBasedMatches, ...result];
    
    // 重複を除去（距離ベースの結果を優先）
    const uniqueResult = finalResult.filter((match, index, self) => 
      index === self.findIndex(m => 
        m.pharmacist_id === match.pharmacist_id && 
        m.pharmacy_id === match.pharmacy_id &&
        m.date === match.date
      )
    );
      
      debugInfo += `\n=== 最終結果 ===\n`;
      debugInfo += `距離ベースマッチング: ${distanceBasedMatches.length}件\n`;
      debugInfo += `従来マッチング: ${result.length}件\n`;
      debugInfo += `最終マッチング件数: ${uniqueResult.length}件\n`;
      
      // デバッグ情報をコンソールに出力
      console.log('AIマッチングエンジンデバッグ:', debugInfo);
      
    return uniqueResult;
      
    } catch (error) {
      debugInfo += `\n=== エラー発生 ===\n`;
      debugInfo += `エラーメッセージ: ${error instanceof Error ? error.message : String(error)}\n`;
      debugInfo += `エラースタック: ${error instanceof Error ? error.stack : 'N/A'}\n`;
      
      console.error('executeOptimalMatching エラー:', error);
      console.log('AIマッチングエンジンエラーデバッグ:', debugInfo);
      
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
        // 薬局・店舗ごとの募集を処理
        const pharmacyPostings = postings.filter(p => p.pharmacy_id === pharmacyId);
        
        for (const posting of pharmacyPostings) {
          const storeName = posting.store_name || 'default';
          const uniqueKey = `${pharmacyId}_${storeName}`;
          const currentUsage = pharmacyUsageCount.get(uniqueKey) || 0;
          const requiredStaff = posting.required_staff || 1;
          
          console.log(`薬局 ${pharmacyId} (${storeName}) の処理: 現在使用 ${currentUsage}/${requiredStaff}`);
          
          // 薬局・店舗の募集人数をチェック
          if (currentUsage >= requiredStaff) {
            console.log(`薬局 ${pharmacyId} (${storeName}) は募集人数に達している - スキップ`);
            continue;
          }

          // この薬局・店舗に適合する薬剤師候補を取得
          const availableCandidates = candidates.filter(candidate => 
            candidate.pharmacy.id === pharmacyId &&
            candidate.pharmacy.name === storeName &&
            !usedPharmacists.has(candidate.pharmacist.id)
          );

          console.log(`薬局 ${pharmacyId} (${storeName}) の利用可能候補: ${availableCandidates.length}件`);

          if (availableCandidates.length === 0) {
            console.log(`薬局 ${pharmacyId} (${storeName}) に利用可能な候補なし - スキップ`);
            continue;
          }

          // 最も評価の高い薬剤師を選択
          const bestCandidate = availableCandidates.reduce((best, current) => {
            const currentScore = pharmacistScores[current.pharmacist.id] || 0;
            const bestScore = pharmacistScores[best.pharmacist.id] || 0;
            return currentScore > bestScore ? current : best;
          });

          console.log(`薬局 ${pharmacyId} (${storeName}) に薬剤師 ${bestCandidate.pharmacist.id} をマッチング`);
          selectedMatches.push(bestCandidate);
          usedPharmacists.add(bestCandidate.pharmacist.id);
          pharmacyUsageCount.set(uniqueKey, currentUsage + 1);
          hasProgress = true; // 進捗があった
        }
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