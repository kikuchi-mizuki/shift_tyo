/**
 * AI Matching Statistics Component
 * AIマッチングの統計情報を表示するコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Brain, Zap } from 'lucide-react';
import { getMatchingStatistics } from './api';

interface AIMatchingStatsProps {
  className?: string;
}

interface MatchingStats {
  totalMatches: number;
  averageSuccessRate: number;
  averageExecutionTime: number;
  algorithmPerformance: {
    [key: string]: {
      count: number;
      averageSuccessRate: number;
      averageExecutionTime: number;
    };
  };
  recentHistory: any[];
}

const AIMatchingStats: React.FC<AIMatchingStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statistics = await getMatchingStatistics();
      setStats(statistics);
    } catch (err) {
      console.error('Error loading AI matching statistics:', err);
      setError('統計情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">統計情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={loadStatistics}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>統計情報がありません</p>
        </div>
      </div>
    );
  }

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getAlgorithmIcon = (algorithm: string) => {
    switch (algorithm) {
      case 'ai_based':
        return <Brain className="w-4 h-4 text-purple-600" />;
      case 'rule_based':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'hybrid':
        return <Zap className="w-4 h-4 text-green-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlgorithmName = (algorithm: string): string => {
    switch (algorithm) {
      case 'ai_based':
        return 'AIベース';
      case 'rule_based':
        return 'ルールベース';
      case 'hybrid':
        return 'ハイブリッド';
      default:
        return algorithm;
    }
  };

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">AIマッチング統計</h3>
        </div>
        <button
          onClick={loadStatistics}
          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
        >
          更新
        </button>
      </div>

      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">総マッチング数</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {stats.totalMatches.toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">平均成功率</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {(stats.averageSuccessRate * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">平均実行時間</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatExecutionTime(stats.averageExecutionTime)}
          </div>
        </div>
      </div>

      {/* アルゴリズム別性能 */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3">アルゴリズム別性能</h4>
        <div className="space-y-3">
          {Object.entries(stats.algorithmPerformance).map(([algorithm, performance]) => (
            <div key={algorithm} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getAlgorithmIcon(algorithm)}
                  <span className="font-medium text-gray-800">
                    {getAlgorithmName(algorithm)}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {performance.count}回実行
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">成功率</div>
                  <div className="text-lg font-semibold text-green-600">
                    {(performance.averageSuccessRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">実行時間</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatExecutionTime(performance.averageExecutionTime)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 最近の履歴 */}
      {stats.recentHistory && stats.recentHistory.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3">最近の実行履歴</h4>
          <div className="space-y-2">
            {stats.recentHistory.slice(0, 5).map((record, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {getAlgorithmIcon(record.matching_type)}
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {new Date(record.date).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.matched_count}件マッチング
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {(record.success_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatExecutionTime(record.execution_time_ms)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* パフォーマンス改善の提案 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Brain className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-semibold text-yellow-800 mb-1">
              AIマッチングの最適化提案
            </h5>
            <div className="text-sm text-yellow-700 space-y-1">
              {stats.averageSuccessRate < 0.8 && (
                <p>• 成功率を向上させるため、より多くの学習データを収集することをお勧めします</p>
              )}
              {stats.averageExecutionTime > 3000 && (
                <p>• 実行時間を短縮するため、アルゴリズムの最適化を検討してください</p>
              )}
              {Object.keys(stats.algorithmPerformance).length === 1 && (
                <p>• 複数のアルゴリズムを試して、最適な組み合わせを見つけてください</p>
              )}
              <p>• 定期的にマッチング結果を評価し、システムの改善を行ってください</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMatchingStats;
