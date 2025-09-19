/**
 * Data Collector for AI Matching
 * マッチング結果のデータ収集と学習データの生成
 */

import { supabase } from '../../lib/supabase';

export interface MatchOutcome {
  id: string;
  pharmacistId: string;
  pharmacyId: string;
  date: string;
  startTime: string;
  endTime: string;
  success: boolean;
  satisfactionScore?: number;
  efficiencyScore?: number;
  feedback?: string;
  completionTime?: string;
  noShow?: boolean;
  earlyLeave?: boolean;
  additionalNotes?: string;
}

export interface LearningData {
  input: {
    pharmacistFeatures: any;
    pharmacyFeatures: any;
    timeFeatures: any;
    contextFeatures: any;
  };
  output: {
    success: boolean;
    satisfaction: number;
    efficiency: number;
  };
  metadata: {
    timestamp: string;
    version: string;
  };
}

export class DataCollector {
  private isCollecting = false;
  private collectedData: MatchOutcome[] = [];

  constructor() {
    this.initializeDataCollection();
  }

  /**
   * データ収集の初期化
   */
  private async initializeDataCollection() {
    try {
      // 既存の確定シフトからデータを収集
      await this.collectHistoricalData();
      this.isCollecting = true;
      console.log('Data collection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize data collection:', error);
    }
  }

  /**
   * 履歴データの収集
   */
  private async collectHistoricalData() {
    try {
      const { data, error } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1000); // 最新1000件

      if (error) {
        console.error('Error collecting historical data:', error);
        return;
      }

      if (data) {
        const outcomes = data.map(shift => this.convertToMatchOutcome(shift));
        this.collectedData.push(...outcomes);
        console.log(`Collected ${outcomes.length} historical match outcomes`);
      }
    } catch (error) {
      console.error('Error in collectHistoricalData:', error);
    }
  }

  /**
   * シフトデータをMatchOutcomeに変換
   */
  private convertToMatchOutcome(shift: any): MatchOutcome {
    return {
      id: shift.id,
      pharmacistId: shift.pharmacist_id,
      pharmacyId: shift.pharmacy_id,
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      success: shift.status === 'confirmed',
      satisfactionScore: shift.satisfaction_score || 0,
      efficiencyScore: shift.efficiency_score || 0,
      feedback: shift.feedback || '',
      completionTime: shift.completion_time || null,
      noShow: shift.no_show || false,
      earlyLeave: shift.early_leave || false,
      additionalNotes: shift.additional_notes || ''
    };
  }

  /**
   * 新しいマッチング結果を記録
   */
  public async recordMatchOutcome(outcome: MatchOutcome): Promise<void> {
    try {
      // データベースに保存
      const { error } = await supabase
        .from('match_outcomes')
        .insert({
          pharmacist_id: outcome.pharmacistId,
          pharmacy_id: outcome.pharmacyId,
          date: outcome.date,
          start_time: outcome.startTime,
          end_time: outcome.endTime,
          success: outcome.success,
          satisfaction_score: outcome.satisfactionScore,
          efficiency_score: outcome.efficiencyScore,
          feedback: outcome.feedback,
          completion_time: outcome.completionTime,
          no_show: outcome.noShow,
          early_leave: outcome.earlyLeave,
          additional_notes: outcome.additionalNotes
        });

      if (error) {
        console.error('Error recording match outcome:', error);
        return;
      }

      // メモリにも保存
      this.collectedData.push(outcome);

      console.log('Match outcome recorded successfully:', outcome.id);
    } catch (error) {
      console.error('Error in recordMatchOutcome:', error);
    }
  }

  /**
   * 学習データの生成
   */
  public async generateLearningData(): Promise<LearningData[]> {
    const learningData: LearningData[] = [];

    for (const outcome of this.collectedData) {
      try {
        const pharmacistFeatures = await this.extractPharmacistFeatures(outcome.pharmacistId);
        const pharmacyFeatures = await this.extractPharmacyFeatures(outcome.pharmacyId);
        const timeFeatures = this.extractTimeFeatures(outcome);
        const contextFeatures = this.extractContextFeatures(outcome);

        const learningItem: LearningData = {
          input: {
            pharmacistFeatures,
            pharmacyFeatures,
            timeFeatures,
            contextFeatures
          },
          output: {
            success: outcome.success,
            satisfaction: outcome.satisfactionScore || 0,
            efficiency: outcome.efficiencyScore || 0
          },
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };

        learningData.push(learningItem);
      } catch (error) {
        console.error('Error generating learning data for outcome:', outcome.id, error);
      }
    }

    return learningData;
  }

  /**
   * 薬剤師の特徴量抽出
   */
  private async extractPharmacistFeatures(pharmacistId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacistId)
        .maybeSingle();

      if (error || !data) {
        return this.getDefaultPharmacistFeatures();
      }

      return {
        id: data.id,
        experience: data.experience || 0,
        rating: data.rating || 0,
        skills: data.skills || [],
        totalShifts: data.total_shifts || 0,
        averageSatisfaction: data.average_satisfaction || 0,
        completionRate: data.completion_rate || 1.0,
        noShowRate: data.no_show_rate || 0,
        preferredPharmacyTypes: data.preferred_pharmacy_types || [],
        maxCommuteTime: data.max_commute_time || 60,
        preferredTimeSlots: data.preferred_time_slots || []
      };
    } catch (error) {
      console.error('Error extracting pharmacist features:', error);
      return this.getDefaultPharmacistFeatures();
    }
  }

  /**
   * 薬局の特徴量抽出
   */
  private async extractPharmacyFeatures(pharmacyId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', pharmacyId)
        .maybeSingle();

      if (error || !data) {
        return this.getDefaultPharmacyFeatures();
      }

      return {
        id: data.id,
        type: data.pharmacy_type || 'community',
        size: data.pharmacy_size || 'medium',
        specialties: data.specialties || [],
        requiredSkills: data.required_skills || [],
        experienceLevel: data.experience_level || 'intermediate',
        specialNeeds: data.special_needs || [],
        averagePharmacistSatisfaction: data.average_pharmacist_satisfaction || 0,
        retentionRate: data.retention_rate || 1.0,
        workEnvironment: data.work_environment || 0
      };
    } catch (error) {
      console.error('Error extracting pharmacy features:', error);
      return this.getDefaultPharmacyFeatures();
    }
  }

  /**
   * 時間の特徴量抽出
   */
  private extractTimeFeatures(outcome: MatchOutcome): any {
    const date = new Date(outcome.date);
    const startTime = new Date(`2000-01-01T${outcome.startTime}`);
    const endTime = new Date(`2000-01-01T${outcome.endTime}`);

    return {
      date: outcome.date,
      startTime: outcome.startTime,
      endTime: outcome.endTime,
      duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60), // 分単位
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: this.isHoliday(outcome.date),
      season: this.getSeason(outcome.date),
      timeSlot: this.getTimeSlot(outcome.startTime, outcome.endTime),
      isPeakHours: this.isPeakHours(outcome.startTime, outcome.endTime)
    };
  }

  /**
   * コンテキストの特徴量抽出
   */
  private extractContextFeatures(outcome: MatchOutcome): any {
    return {
      totalRequests: this.getTotalRequestsForDate(outcome.date),
      totalPostings: this.getTotalPostingsForDate(outcome.date),
      demandLevel: this.calculateDemandLevel(outcome.date),
      competitionLevel: this.calculateCompetitionLevel(outcome.date),
      weather: this.getWeatherData(outcome.date), // 将来的に実装
      events: this.getLocalEvents(outcome.date) // 将来的に実装
    };
  }

  /**
   * デフォルトの薬剤師特徴量
   */
  private getDefaultPharmacistFeatures(): any {
    return {
      id: 'unknown',
      experience: 0,
      rating: 0,
      skills: [],
      totalShifts: 0,
      averageSatisfaction: 0,
      completionRate: 1.0,
      noShowRate: 0,
      preferredPharmacyTypes: [],
      maxCommuteTime: 60,
      preferredTimeSlots: []
    };
  }

  /**
   * デフォルトの薬局特徴量
   */
  private getDefaultPharmacyFeatures(): any {
    return {
      id: 'unknown',
      type: 'community',
      size: 'medium',
      specialties: [],
      requiredSkills: [],
      experienceLevel: 'intermediate',
      specialNeeds: [],
      averagePharmacistSatisfaction: 0,
      retentionRate: 1.0,
      workEnvironment: 0
    };
  }

  /**
   * 祝日の判定
   */
  private isHoliday(date: string): boolean {
    const month = new Date(date).getMonth();
    const day = new Date(date).getDate();
    
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
   * 時間帯の取得
   */
  private getTimeSlot(startTime: string, endTime: string): string {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);

    if (start >= 9 && end <= 13) return 'morning';
    if (start >= 13 && end <= 18) return 'afternoon';
    if (start >= 9 && end <= 18) return 'full';
    return 'other';
  }

  /**
   * ピーク時間の判定
   */
  private isPeakHours(startTime: string, endTime: string): boolean {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);

    // 朝のピーク: 9-11時、夕方のピーク: 16-18時
    return (start >= 9 && start <= 11) || (start >= 16 && start <= 18);
  }

  /**
   * 指定日の希望数を取得
   */
  private async getTotalRequestsForDate(date: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('shift_requests')
        .select('*', { count: 'exact', head: true })
        .eq('date', date);

      if (error) {
        console.error('Error getting total requests:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalRequestsForDate:', error);
      return 0;
    }
  }

  /**
   * 指定日の募集数を取得
   */
  private async getTotalPostingsForDate(date: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('shift_postings')
        .select('*', { count: 'exact', head: true })
        .eq('date', date);

      if (error) {
        console.error('Error getting total postings:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalPostingsForDate:', error);
      return 0;
    }
  }

  /**
   * 需要レベルの計算
   */
  private calculateDemandLevel(date: string): 'low' | 'medium' | 'high' {
    // 簡易的な需要レベル計算
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = this.isHoliday(date);

    if (isWeekend || isHoliday) return 'high';
    if (dayOfWeek === 1 || dayOfWeek === 5) return 'medium'; // 月曜日、金曜日
    return 'low';
  }

  /**
   * 競争レベルの計算
   */
  private calculateCompetitionLevel(date: string): 'low' | 'medium' | 'high' {
    // 簡易的な競争レベル計算
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) return 'high';
    if (dayOfWeek === 1 || dayOfWeek === 5) return 'medium';
    return 'low';
  }

  /**
   * 天気データの取得（将来的に実装）
   */
  private getWeatherData(date: string): any {
    // 将来的に天気APIと連携
    return {
      temperature: 20,
      condition: 'sunny',
      precipitation: 0
    };
  }

  /**
   * 地域イベントの取得（将来的に実装）
   */
  private getLocalEvents(date: string): any[] {
    // 将来的に地域イベントAPIと連携
    return [];
  }

  /**
   * データのエクスポート
   */
  public async exportLearningData(): Promise<string> {
    const learningData = await this.generateLearningData();
    return JSON.stringify(learningData, null, 2);
  }

  /**
   * データの統計情報
   */
  public getDataStatistics(): any {
    const total = this.collectedData.length;
    const successful = this.collectedData.filter(d => d.success).length;
    const averageSatisfaction = this.collectedData
      .filter(d => d.satisfactionScore)
      .reduce((sum, d) => sum + (d.satisfactionScore || 0), 0) / 
      this.collectedData.filter(d => d.satisfactionScore).length;

    return {
      totalMatches: total,
      successRate: total > 0 ? successful / total : 0,
      averageSatisfaction: averageSatisfaction || 0,
      dataQuality: this.assessDataQuality()
    };
  }

  /**
   * データ品質の評価
   */
  private assessDataQuality(): 'poor' | 'fair' | 'good' | 'excellent' {
    const total = this.collectedData.length;
    if (total < 10) return 'poor';
    if (total < 50) return 'fair';
    if (total < 200) return 'good';
    return 'excellent';
  }
}

export default DataCollector;
