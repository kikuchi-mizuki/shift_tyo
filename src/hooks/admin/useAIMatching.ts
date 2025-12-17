/**
 * useAIMatching.ts
 * AIマッチング関連の状態管理を行うカスタムフック
 */

import { useState, useCallback, useEffect } from 'react';
import { AIMatchingEngine, MatchCandidate } from '../../features/ai-matching/aiMatchingEngine';
import { executeAIMatching } from '../../services/admin/MatchingService';
import { SupabaseClient } from '@supabase/supabase-js';
import { safeLength } from '../../utils/admin/arrayHelpers';

interface UseAIMatchingReturn {
  aiMatches: MatchCandidate[];
  aiMatchesByDate: { [date: string]: MatchCandidate[] };
  aiMatchingEngine: AIMatchingEngine | null;
  aiMatchingLoading: boolean;
  useAIMatching: boolean;
  monthlyMatchingExecuted: boolean;

  setAiMatches: (matches: MatchCandidate[]) => void;
  setAiMatchesByDate: (matchesByDate: { [date: string]: MatchCandidate[] } | ((prev: { [date: string]: MatchCandidate[] }) => { [date: string]: MatchCandidate[] })) => void;
  setUseAIMatching: (use: boolean) => void;
  setMonthlyMatchingExecuted: (executed: boolean) => void;
  executeMatching: (date: string) => Promise<void>;
  executeMonthlyMatching: (currentDate: Date) => Promise<void>;
}

export const useAIMatching = (
  supabase: SupabaseClient,
  requests: any[],
  postings: any[],
  assigned: any[],
  userProfiles: any,
  ratings: any[],
  storeNgPharmacists: { [pharmacyId: string]: any[] },
  storeNgPharmacies: { [pharmacistId: string]: any[] }
): UseAIMatchingReturn => {
  const [aiMatches, setAiMatches] = useState<MatchCandidate[]>([]);
  const [aiMatchesByDate, setAiMatchesByDate] = useState<{ [date: string]: MatchCandidate[] }>({});
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [useAIMatching, setUseAIMatching] = useState(true);
  const [monthlyMatchingExecuted, setMonthlyMatchingExecuted] = useState(false);

  // AIマッチングエンジンを初期化
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const engine = new AIMatchingEngine();
        setAiMatchingEngine(engine);
      } catch (error) {
        console.error('❌ Failed to initialize AI Matching Engine:', error);
        setUseAIMatching(false);
      }
    };

    initializeAI();
  }, []);

  /**
   * 指定日のAIマッチングを実行
   */
  const executeMatching = useCallback(async (date: string) => {
    if (!aiMatchingEngine) {
      console.error('AI Matching Engine not initialized');
      return;
    }

    setAiMatchingLoading(true);
    try {
      const matches = await executeAIMatching(
        date,
        supabase,
        requests,
        postings,
        assigned,
        userProfiles,
        ratings,
        aiMatchingEngine,
        storeNgPharmacists,
        storeNgPharmacies
      );

      setAiMatches(matches);
      setAiMatchesByDate(prev => ({
        ...prev,
        [date]: matches
      }));
    } catch (error) {
      console.error('AI Matching failed:', error);
    } finally {
      setAiMatchingLoading(false);
    }
  }, [aiMatchingEngine, supabase, requests, postings, assigned, userProfiles, ratings, storeNgPharmacists, storeNgPharmacies]);

  /**
   * 1ヶ月分のAIマッチングを実行
   */
  const executeMonthlyMatching = useCallback(async (currentDate: Date) => {
    // ===== デバッグ用：最初の行 =====
    window.alert('🚀 useAIMatching: executeMonthlyMatching関数が呼ばれました！');
    console.error('🚀 executeMonthlyMatching START');
    console.error('🚀 currentDate:', currentDate);
    console.error('🚀 aiMatchingEngine:', aiMatchingEngine ? 'initialized' : 'NOT initialized');

    if (!aiMatchingEngine) {
      console.error('❌ AI Matching Engine not initialized');
      window.alert('エラー: AI Matching Engine not initialized');
      return;
    }

    setAiMatchingLoading(true);
    try {
      // 既存のマッチング結果をクリア
      setAiMatches([]);
      setAiMatchesByDate({});

      // pendingデータをクリア
      if (supabase) {
        await supabase
          .from('assigned_shifts')
          .delete()
          .eq('status', 'pending');
      }

      // 1ヶ月分の日付リストを生成
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthlyDates: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        monthlyDates.push(date.toISOString().split('T')[0]);
      }

      // 各日付に対してAIマッチングを実行
      for (const date of monthlyDates) {
        await executeMatching(date);
      }

      setMonthlyMatchingExecuted(true);

    } catch (error) {
      console.error('1ヶ月分のAIマッチングエラー:', error);
      alert('1ヶ月分のAIマッチングでエラーが発生しました。');
    } finally {
      setAiMatchingLoading(false);
    }
  }, [aiMatchingEngine, supabase, executeMatching]);

  return {
    aiMatches,
    aiMatchesByDate,
    aiMatchingEngine,
    aiMatchingLoading,
    useAIMatching,
    monthlyMatchingExecuted,
    setAiMatches,
    setAiMatchesByDate,
    setUseAIMatching,
    setMonthlyMatchingExecuted,
    executeMatching,
    executeMonthlyMatching
  };
};
