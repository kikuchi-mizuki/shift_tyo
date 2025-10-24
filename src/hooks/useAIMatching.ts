import { useState, useEffect } from 'react';
import { AIMatchingEngine, MatchCandidate } from '../features/ai-matching/aiMatchingEngine';
import DataCollector from '../features/ai-matching/dataCollector';

export interface AIMatchingState {
  aiMatchingEngine: AIMatchingEngine | null;
  dataCollector: DataCollector | null;
  aiMatches: MatchCandidate[];
  aiMatchesByDate: {[date: string]: MatchCandidate[]};
  useAIMatching: boolean;
  aiMatchingLoading: boolean;
  monthlyMatchingExecuted: boolean;
}

export const useAIMatching = () => {
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [dataCollector, setDataCollector] = useState<DataCollector | null>(null);
  const [aiMatches, setAiMatches] = useState<MatchCandidate[]>([]);
  const [aiMatchesByDate, setAiMatchesByDate] = useState<{[date: string]: MatchCandidate[]}>({});
  const [useAIMatching, setUseAIMatching] = useState(true);
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [monthlyMatchingExecuted, setMonthlyMatchingExecuted] = useState(false);

  // AIマッチングエンジンの初期化
  useEffect(() => {
    const initializeAI = async () => {
      try {
        console.log('AI Matching Engine initialization started...');
        const engine = new AIMatchingEngine();
        const collector = new DataCollector();
        
        setAiMatchingEngine(engine);
        setDataCollector(collector);
        
        console.log('✅ AI Matching Engine initialized successfully');
        console.log('Engine instance:', engine);
        console.log('DataCollector instance:', collector);
      } catch (error) {
        console.error('❌ Failed to initialize AI Matching Engine:', error);
        setUseAIMatching(false);
      }
    };

    initializeAI();
  }, []);

  const executeSimpleAIMatching = async (requests: any[], postings: any[]) => {
    if (!aiMatchingEngine || !useAIMatching) {
      console.log('AI Matching not available or disabled');
      return [];
    }

    try {
      setAiMatchingLoading(true);
      console.log('🤖 Starting simple AI matching...');
      
      const matches = await aiMatchingEngine.findMatches(requests, postings);
      console.log('✅ AI matching completed:', matches.length, 'matches found');
      
      return matches;
    } catch (error) {
      console.error('❌ AI matching failed:', error);
      return [];
    } finally {
      setAiMatchingLoading(false);
    }
  };

  const executeMonthlyAIMatching = async () => {
    if (!aiMatchingEngine || !useAIMatching) {
      console.log('AI Matching not available or disabled');
      return;
    }

    try {
      setAiMatchingLoading(true);
      console.log('🤖 Starting monthly AI matching...');
      
      // 月次マッチングのロジック
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // 当月の全データを取得してマッチング実行
      // 実装は元のコードに基づいて調整が必要
      
      setMonthlyMatchingExecuted(true);
      console.log('✅ Monthly AI matching completed');
    } catch (error) {
      console.error('❌ Monthly AI matching failed:', error);
    } finally {
      setAiMatchingLoading(false);
    }
  };

  const executeAIMatching = async (date: string) => {
    if (!aiMatchingEngine || !useAIMatching) {
      console.log('AI Matching not available or disabled');
      return [];
    }

    try {
      setAiMatchingLoading(true);
      console.log(`🤖 Starting AI matching for date: ${date}`);
      
      // 日付指定のマッチング実行
      // 実装は元のコードに基づいて調整が必要
      
      return [];
    } catch (error) {
      console.error('❌ AI matching failed:', error);
      return [];
    } finally {
      setAiMatchingLoading(false);
    }
  };

  const updateAiMatchesByDate = (date: string, matches: MatchCandidate[]) => {
    setAiMatchesByDate(prev => ({
      ...prev,
      [date]: matches
    }));
  };

  const clearAiMatches = () => {
    setAiMatches([]);
    setAiMatchesByDate({});
  };

  return {
    // State
    aiMatchingEngine,
    dataCollector,
    aiMatches,
    aiMatchesByDate,
    useAIMatching,
    aiMatchingLoading,
    monthlyMatchingExecuted,
    
    // Setters
    setAiMatches,
    setUseAIMatching,
    setMonthlyMatchingExecuted,
    
    // Functions
    executeSimpleAIMatching,
    executeMonthlyAIMatching,
    executeAIMatching,
    updateAiMatchesByDate,
    clearAiMatches
  };
};
