import React, { useState, useEffect } from 'react';
import { Brain, Zap } from 'lucide-react';
import { AIMatchingEngine, MatchCandidate } from '../features/ai-matching/aiMatchingEngine';
import DataCollector from '../features/ai-matching/dataCollector';

interface AIMatchingPanelProps {
  requests: any[];
  postings: any[];
  assigned: any[];
  userProfiles: any;
  ratings: any[];
  onExecuteMatching: (date: string) => Promise<void>;
  onExecuteMonthlyMatching: () => Promise<void>;
  selectedDate: string;
  loading?: boolean;
}

const AIMatchingPanel: React.FC<AIMatchingPanelProps> = ({
  requests,
  postings,
  assigned,
  userProfiles,
  ratings,
  onExecuteMatching,
  onExecuteMonthlyMatching,
  selectedDate,
  loading = false
}) => {
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [dataCollector, setDataCollector] = useState<DataCollector | null>(null);
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [useAIMatching, setUseAIMatching] = useState(true);

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
      } catch (error) {
        console.error('❌ Failed to initialize AI Matching Engine:', error);
        setUseAIMatching(false);
      }
    };

    initializeAI();
  }, []);

  const handleExecuteMatching = async () => {
    if (!selectedDate) {
      console.warn('No date selected for matching');
      return;
    }

    try {
      setAiMatchingLoading(true);
      await onExecuteMatching(selectedDate);
    } catch (error) {
      console.error('Error executing matching:', error);
    } finally {
      setAiMatchingLoading(false);
    }
  };

  const handleExecuteMonthlyMatching = async () => {
    try {
      setAiMatchingLoading(true);
      await onExecuteMonthlyMatching();
    } catch (error) {
      console.error('Error executing monthly matching:', error);
    } finally {
      setAiMatchingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AIマッチング設定 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">AIマッチング</h3>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useAIMatching}
                onChange={(e) => setUseAIMatching(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">AIマッチングを有効にする</span>
            </label>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          {useAIMatching ? 'AIマッチングが有効です' : '従来のルールベースマッチングを使用中'}
        </div>
      </div>

      {/* 日別マッチング */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-md font-semibold text-gray-800 mb-3">
            {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日のマッチング
          </h4>
          <button
            onClick={handleExecuteMatching}
            disabled={aiMatchingLoading || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {aiMatchingLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>マッチング実行中...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>選択日のマッチングを実行</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 月次マッチング */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-md font-semibold text-gray-800 mb-3">1ヶ月分のシフト自動組み</h4>
        <button
          onClick={handleExecuteMonthlyMatching}
          disabled={aiMatchingLoading || loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {aiMatchingLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>AI分析中...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>1ヶ月分のシフトを自動で組む</span>
            </>
          )}
        </button>
      </div>

      {/* システム状態 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">システム状態</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div>AIエンジン: {aiMatchingEngine ? '✅ 初期化済み' : '❌ 未初期化'}</div>
          <div>データコレクター: {dataCollector ? '✅ 初期化済み' : '❌ 未初期化'}</div>
          <div>シフト希望: {requests.length}件</div>
          <div>シフト募集: {postings.length}件</div>
          <div>確定シフト: {assigned.length}件</div>
        </div>
      </div>
    </div>
  );
};

export default AIMatchingPanel;
