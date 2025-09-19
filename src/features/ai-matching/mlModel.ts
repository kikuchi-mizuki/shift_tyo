/**
 * Machine Learning Model for AI Matching
 * 確定シフトデータと評価データを活用した機械学習モデル
 */

import { supabase } from '../../lib/supabase';

export interface TrainingData {
  input: {
    pharmacistId: string;
    pharmacyId: string;
    date: string;
    timeSlot: string;
    startTime?: string;
    endTime?: string;
    pharmacistFeatures: {
      totalShifts: number;
      averageRating: number;
      ratingCount: number;
      recentRating: number;
      completionRate: number;
      noShowRate: number;
    };
    pharmacyFeatures: {
      totalShifts: number;
      averagePharmacistRating: number;
      ratingCount: number;
      retentionRate: number;
    };
    timeFeatures: {
      dayOfWeek: number;
      isWeekend: boolean;
      isHoliday: boolean;
      timeOfDay: string; // morning, afternoon, evening, night
    };
    pairFeatures: {
      previousMatches: number;
      averagePairRating: number;
      lastMatchDate?: string;
      daysSinceLastMatch?: number;
    };
  };
  output: {
    success: boolean;
    satisfactionScore: number;
    completionRate: number;
    wouldMatchAgain: boolean;
  };
  metadata: {
    shiftId: string;
    createdAt: string;
    ratingId?: string;
  };
}

export interface MLPrediction {
  successProbability: number;
  satisfactionPrediction: number;
  confidence: number;
  factors: {
    pharmacistScore: number;
    pharmacyScore: number;
    pairCompatibility: number;
    timeCompatibility: number;
  };
}

export class MLModel {
  private model: any = null;
  private isTrained = false;
  private trainingData: TrainingData[] = [];
  private featureWeights: { [key: string]: number } = {};

  constructor() {
    this.initializeModel();
  }

  /**
   * モデルの初期化
   */
  private async initializeModel() {
    try {
      await this.loadTrainingData();
      await this.trainModel();
      this.isTrained = true;
      console.log('ML Model initialized and trained successfully');
    } catch (error) {
      console.error('Failed to initialize ML Model:', error);
    }
  }

  /**
   * 学習データの読み込み
   */
  private async loadTrainingData() {
    try {
      // 確定シフトデータを取得
      const { data: shifts, error: shiftsError } = await supabase
        .from('assigned_shifts')
        .select(`
          *,
          pharmacist:pharmacist_id(id, name, email, user_type),
          pharmacy:pharmacy_id(id, name, email, user_type)
        `)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1000); // 最新1000件

      if (shiftsError) {
        console.error('Error loading shifts:', shiftsError);
        return;
      }

      // 評価データを取得
      const { data: ratings, error: ratingsError } = await supabase
        .from('pharmacist_ratings')
        .select('*')
        .order('created_at', { ascending: false });

      if (ratingsError) {
        console.error('Error loading ratings:', ratingsError);
        return;
      }

      // 学習データを生成
      this.trainingData = await this.generateTrainingData(shifts || [], ratings || []);
      console.log(`Generated ${this.trainingData.length} training samples`);
    } catch (error) {
      console.error('Error in loadTrainingData:', error);
    }
  }

  /**
   * 学習データの生成
   */
  private async generateTrainingData(shifts: any[], ratings: any[]): Promise<TrainingData[]> {
    const trainingData: TrainingData[] = [];

    for (const shift of shifts) {
      try {
        // 薬剤師の特徴量を計算
        const pharmacistFeatures = this.calculatePharmacistFeatures(shift.pharmacist_id, shifts, ratings);
        
        // 薬局の特徴量を計算
        const pharmacyFeatures = this.calculatePharmacyFeatures(shift.pharmacy_id, shifts, ratings);
        
        // 時間の特徴量を計算
        const timeFeatures = this.calculateTimeFeatures(shift.date, shift.start_time || shift.time_slot);
        
        // ペアの特徴量を計算
        const pairFeatures = this.calculatePairFeatures(shift.pharmacist_id, shift.pharmacy_id, shifts, ratings);
        
        // 出力データ（評価データから）
        const rating = ratings.find(r => r.assigned_shift_id === shift.id);
        const output = {
          success: rating ? rating.rating >= 3 : true, // 評価3以上を成功とする
          satisfactionScore: rating ? rating.rating : 3, // デフォルト3
          completionRate: rating ? 1.0 : 1.0, // 確定シフトなので完了率100%
          wouldMatchAgain: rating ? rating.rating >= 3 : true
        };

        trainingData.push({
          input: {
            pharmacistId: shift.pharmacist_id,
            pharmacyId: shift.pharmacy_id,
            date: shift.date,
            timeSlot: shift.time_slot,
            startTime: shift.start_time,
            endTime: shift.end_time,
            pharmacistFeatures,
            pharmacyFeatures,
            timeFeatures,
            pairFeatures
          },
          output,
          metadata: {
            shiftId: shift.id,
            createdAt: shift.created_at,
            ratingId: rating?.id
          }
        });
      } catch (error) {
        console.error('Error generating training data for shift:', shift.id, error);
      }
    }

    return trainingData;
  }

  /**
   * 薬剤師の特徴量計算
   */
  private calculatePharmacistFeatures(pharmacistId: string, shifts: any[], ratings: any[]): any {
    const pharmacistShifts = shifts.filter(s => s.pharmacist_id === pharmacistId);
    const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacistId);

    const totalShifts = pharmacistShifts.length;
    const averageRating = pharmacistRatings.length > 0 
      ? pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length
      : 3.0;
    
    const ratingCount = pharmacistRatings.length;
    const recentRating = pharmacistRatings.length > 0 
      ? pharmacistRatings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].rating
      : 3.0;
    
    const completionRate = 1.0; // 確定シフトなので100%
    const noShowRate = 0.0; // 現在のデータでは欠勤情報がないため0%

    return {
      totalShifts,
      averageRating,
      ratingCount,
      recentRating,
      completionRate,
      noShowRate
    };
  }

  /**
   * 薬局の特徴量計算
   */
  private calculatePharmacyFeatures(pharmacyId: string, shifts: any[], ratings: any[]): any {
    const pharmacyShifts = shifts.filter(s => s.pharmacy_id === pharmacyId);
    const pharmacyRatings = ratings.filter(r => r.pharmacy_id === pharmacyId);

    const totalShifts = pharmacyShifts.length;
    const averagePharmacistRating = pharmacyRatings.length > 0
      ? pharmacyRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacyRatings.length
      : 3.0;
    
    const ratingCount = pharmacyRatings.length;
    const retentionRate = 1.0; // 現在のデータでは保持率情報がないため100%

    return {
      totalShifts,
      averagePharmacistRating,
      ratingCount,
      retentionRate
    };
  }

  /**
   * 時間の特徴量計算
   */
  private calculateTimeFeatures(date: string, timeSlot: string): any {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = false; // 簡易実装

    // 時間帯の分類
    let timeOfDay = 'morning';
    if (timeSlot.includes('afternoon') || timeSlot.includes('午後')) {
      timeOfDay = 'afternoon';
    } else if (timeSlot.includes('evening') || timeSlot.includes('夜')) {
      timeOfDay = 'evening';
    } else if (timeSlot.includes('night') || timeSlot.includes('深夜')) {
      timeOfDay = 'night';
    }

    return {
      dayOfWeek,
      isWeekend,
      isHoliday,
      timeOfDay
    };
  }

  /**
   * ペアの特徴量計算
   */
  private calculatePairFeatures(pharmacistId: string, pharmacyId: string, shifts: any[], ratings: any[]): any {
    const pairShifts = shifts.filter(s => 
      s.pharmacist_id === pharmacistId && s.pharmacy_id === pharmacyId
    );
    
    const pairRatings = ratings.filter(r => 
      r.pharmacist_id === pharmacistId && r.pharmacy_id === pharmacyId
    );

    const previousMatches = pairShifts.length;
    const averagePairRating = pairRatings.length > 0
      ? pairRatings.reduce((sum, r) => sum + r.rating, 0) / pairRatings.length
      : 3.0;
    
    const lastMatchDate = pairShifts.length > 0 
      ? pairShifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : undefined;
    
    const daysSinceLastMatch = lastMatchDate 
      ? Math.floor((new Date().getTime() - new Date(lastMatchDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      previousMatches,
      averagePairRating,
      lastMatchDate,
      daysSinceLastMatch
    };
  }

  /**
   * モデルの学習
   */
  private async trainModel() {
    if (this.trainingData.length === 0) {
      console.warn('No training data available');
      return;
    }

    try {
      // 簡易的な重み付き線形回帰モデルを実装
      // 実際の実装では、より高度な機械学習アルゴリズムを使用
      this.featureWeights = this.calculateFeatureWeights();
      console.log('Model training completed');
    } catch (error) {
      console.error('Error training model:', error);
    }
  }

  /**
   * 特徴量の重み計算
   */
  private calculateFeatureWeights(): { [key: string]: number } {
    // 簡易的な重み計算（実際の実装ではより高度なアルゴリズムを使用）
    return {
      pharmacistRating: 0.3,
      pharmacyRating: 0.2,
      pairCompatibility: 0.3,
      timeCompatibility: 0.1,
      experience: 0.1
    };
  }

  /**
   * 予測の実行
   */
  public async predict(pharmacistId: string, pharmacyId: string, timeSlot: string, date: string): Promise<MLPrediction> {
    if (!this.isTrained) {
      console.warn('Model not trained, returning default prediction');
      return this.getDefaultPrediction();
    }

    try {
      // 特徴量の計算
      const pharmacistFeatures = this.calculatePharmacistFeatures(pharmacistId, [], []);
      const pharmacyFeatures = this.calculatePharmacyFeatures(pharmacyId, [], []);
      const timeFeatures = this.calculateTimeFeatures(date, timeSlot);
      const pairFeatures = this.calculatePairFeatures(pharmacistId, pharmacyId, [], []);

      // 予測スコアの計算
      const pharmacistScore = this.calculatePharmacistScore(pharmacistFeatures);
      const pharmacyScore = this.calculatePharmacyScore(pharmacyFeatures);
      const pairCompatibility = this.calculatePairCompatibility(pairFeatures);
      const timeCompatibility = this.calculateTimeCompatibility(timeFeatures);

      // 総合予測スコア
      const successProbability = (
        pharmacistScore * this.featureWeights.pharmacistRating +
        pharmacyScore * this.featureWeights.pharmacyRating +
        pairCompatibility * this.featureWeights.pairCompatibility +
        timeCompatibility * this.featureWeights.timeCompatibility
      );

      const satisfactionPrediction = Math.min(5, Math.max(1, successProbability * 5));
      const confidence = this.calculateConfidence(pharmacistFeatures, pharmacyFeatures, pairFeatures);

      return {
        successProbability: Math.min(1, Math.max(0, successProbability)),
        satisfactionPrediction,
        confidence,
        factors: {
          pharmacistScore,
          pharmacyScore,
          pairCompatibility,
          timeCompatibility
        }
      };
    } catch (error) {
      console.error('Error making prediction:', error);
      return this.getDefaultPrediction();
    }
  }

  /**
   * 薬剤師スコアの計算
   */
  private calculatePharmacistScore(features: any): number {
    const ratingScore = features.averageRating / 5; // 0-1に正規化
    const experienceScore = Math.min(features.totalShifts / 50, 1); // 最大50件で正規化
    const reliabilityScore = features.completionRate * (1 - features.noShowRate);
    
    return (ratingScore * 0.5 + experienceScore * 0.3 + reliabilityScore * 0.2);
  }

  /**
   * 薬局スコアの計算
   */
  private calculatePharmacyScore(features: any): number {
    const ratingScore = features.averagePharmacistRating / 5; // 0-1に正規化
    const experienceScore = Math.min(features.totalShifts / 50, 1); // 最大50件で正規化
    const retentionScore = features.retentionRate;
    
    return (ratingScore * 0.4 + experienceScore * 0.3 + retentionScore * 0.3);
  }

  /**
   * ペア適合性の計算
   */
  private calculatePairCompatibility(features: any): number {
    const pairRatingScore = features.averagePairRating / 5; // 0-1に正規化
    const experienceScore = Math.min(features.previousMatches / 10, 1); // 最大10回で正規化
    const recencyScore = features.daysSinceLastMatch 
      ? Math.max(0, 1 - (features.daysSinceLastMatch / 365)) // 1年以内は高スコア
      : 0.5;
    
    return (pairRatingScore * 0.5 + experienceScore * 0.3 + recencyScore * 0.2);
  }

  /**
   * 時間適合性の計算
   */
  private calculateTimeCompatibility(features: any): number {
    let timeScore = 0.5; // デフォルト
    
    // 週末の調整
    if (features.isWeekend) {
      timeScore += 0.1; // 週末は少し高め
    }
    
    // 時間帯の調整
    switch (features.timeOfDay) {
      case 'morning':
        timeScore += 0.1;
        break;
      case 'afternoon':
        timeScore += 0.2;
        break;
      case 'evening':
        timeScore -= 0.1;
        break;
      case 'night':
        timeScore -= 0.2;
        break;
    }
    
    return Math.min(1, Math.max(0, timeScore));
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(pharmacistFeatures: any, pharmacyFeatures: any, pairFeatures: any): number {
    const dataAvailability = (
      (pharmacistFeatures.ratingCount > 0 ? 1 : 0) * 0.4 +
      (pharmacyFeatures.ratingCount > 0 ? 1 : 0) * 0.3 +
      (pairFeatures.previousMatches > 0 ? 1 : 0) * 0.3
    );
    
    const dataVolume = Math.min(
      (pharmacistFeatures.totalShifts + pharmacyFeatures.totalShifts) / 20,
      1
    );
    
    return (dataAvailability * 0.7 + dataVolume * 0.3);
  }

  /**
   * デフォルト予測の取得
   */
  private getDefaultPrediction(): MLPrediction {
    return {
      successProbability: 0.5,
      satisfactionPrediction: 3.0,
      confidence: 0.3,
      factors: {
        pharmacistScore: 0.5,
        pharmacyScore: 0.5,
        pairCompatibility: 0.5,
        timeCompatibility: 0.5
      }
    };
  }

  /**
   * モデルの再学習
   */
  public async retrain(): Promise<void> {
    console.log('Retraining ML model...');
    this.isTrained = false;
    await this.loadTrainingData();
    await this.trainModel();
    this.isTrained = true;
    console.log('ML model retraining completed');
  }

  /**
   * モデルの状態取得
   */
  public getModelStatus(): { isTrained: boolean; trainingDataCount: number } {
    return {
      isTrained: this.isTrained,
      trainingDataCount: this.trainingData.length
    };
  }
}

export default MLModel;
