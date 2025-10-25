import React, { useState, useEffect } from 'react';
import { Brain, Zap, AlertCircle } from 'lucide-react';
import { AIMatchingEngine, MatchCandidate } from '../../features/ai-matching/aiMatchingEngine';
import { supabase } from '../../lib/supabase';

interface AdminMatchingProps {
  selectedDate: string;
  requests: any[];
  postings: any[];
  assigned: any[];
  userProfiles: any;
  aiMatchesByDate: { [date: string]: any[] };
  onMatchingComplete: (matches: any[]) => void;
  onMatchingUpdate: (date: string, matches: any[]) => void;
}

const AdminMatching: React.FC<AdminMatchingProps> = ({
  selectedDate,
  requests,
  postings,
  assigned,
  userProfiles,
  aiMatchesByDate,
  onMatchingComplete,
  onMatchingUpdate
}) => {
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingResults, setMatchingResults] = useState<any[]>([]);

  // AIマッチングエンジンの初期化
  useEffect(() => {
    const initializeMatchingEngine = async () => {
      try {
        const engine = new AIMatchingEngine();
        await engine.initialize();
        setAiMatchingEngine(engine);
        console.log('AI Matching Engine initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AI Matching Engine:', error);
      }
    };

    initializeMatchingEngine();
  }, []);

  // マッチング分析の実行
  const performMatchingAnalysis = (dayRequests: any[], dayPostings: any[], date: string) => {
    if (!aiMatchingEngine) return { matches: [], matchedPharmacies: [] };

    try {
      const result = aiMatchingEngine.performMatching(dayRequests, dayPostings, userProfiles);
      console.log(`マッチング分析完了 [${date}]:`, result);
      return result;
    } catch (error) {
      console.error('マッチング分析エラー:', error);
      return { matches: [], matchedPharmacies: [] };
    }
  };

  // AIマッチングの実行
  const executeAIMatching = async () => {
    if (!aiMatchingEngine || !selectedDate) {
      console.error('AI Matching Engine not initialized or no date selected');
      return;
    }

    setIsMatching(true);
    try {
      // その日のデータをフィルタリング
      const dayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === selectedDate) : [];
      const dayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === selectedDate) : [];
      
      // 確定済みのシフトを除外
      const confirmedShifts = Array.isArray(assigned) 
        ? assigned.filter((s: any) => s?.date === selectedDate && s?.status === 'confirmed')
        : [];
      
      const confirmedPharmacists = new Set(confirmedShifts.map((s: any) => s.pharmacist_id));
      const confirmedPharmacies = new Set(confirmedShifts.map((s: any) => s.pharmacy_id));

      // 確定済みを除外したデータ
      const filteredRequests = dayRequests.filter((r: any) => !confirmedPharmacists.has(r.pharmacist_id));
      const filteredPostings = dayPostings.filter((p: any) => {
        const confirmedCount = confirmedShifts.filter((s: any) => s.pharmacy_id === p.pharmacy_id).length;
        return confirmedCount < (p.required_staff || 1);
      });

      console.log('=== AIマッチング実行 ===', {
        selectedDate,
        originalRequests: safeLength(dayRequests),
        originalPostings: safeLength(dayPostings),
        filteredRequests: safeLength(filteredRequests),
        filteredPostings: safeLength(filteredPostings),
        confirmedShifts: safeLength(confirmedShifts)
      });

      // マッチング実行
      const matchingResult = performMatchingAnalysis(filteredRequests, filteredPostings, selectedDate);
      const matches = matchingResult.matches || [];

      if (matches.length > 0) {
        // マッチング結果をassigned_shiftsテーブルに保存
        const shiftsToInsert = matches.map((match: any) => ({
          pharmacist_id: match.pharmacist.id,
          pharmacy_id: match.pharmacy.id,
          date: selectedDate,
          start_time: match.timeSlot.start,
          end_time: match.timeSlot.end,
          status: 'pending',
          store_name: match.pharmacy.store_name || match.pharmacy.name,
          created_at: new Date().toISOString()
        }));

        const { data: insertedShifts, error: insertError } = await supabase
          .from('assigned_shifts')
          .insert(shiftsToInsert)
          .select();

        if (insertError) {
          console.error('マッチング結果の保存に失敗:', insertError);
          throw insertError;
        }

        console.log('マッチング結果を保存しました:', insertedShifts);
        
        // 状態を更新
        setMatchingResults(matches);
        onMatchingUpdate(selectedDate, matches);
        onMatchingComplete(matches);
      } else {
        console.log('マッチング候補が見つかりませんでした');
        setMatchingResults([]);
      }
    } catch (error) {
      console.error('AIマッチング実行エラー:', error);
    } finally {
      setIsMatching(false);
    }
  };

  // マッチング結果の確定
  const confirmMatchingResults = async () => {
    if (!selectedDate) return;

    try {
      const { error } = await supabase
        .from('assigned_shifts')
        .update({ status: 'confirmed' })
        .eq('date', selectedDate)
        .eq('status', 'pending');

      if (error) {
        console.error('マッチング結果の確定に失敗:', error);
        return;
      }

      console.log('マッチング結果を確定しました');
      onMatchingUpdate(selectedDate, []);
    } catch (error) {
      console.error('マッチング結果確定エラー:', error);
    }
  };

  const dayMatches = aiMatchesByDate[selectedDate] || [];
  const hasMatches = dayMatches.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
          <Brain className="w-5 h-5" />
          <span>AIマッチング</span>
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* マッチング実行ボタン */}
        <div className="flex space-x-2">
          <button
            onClick={executeAIMatching}
            disabled={isMatching || !selectedDate}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isMatching || !selectedDate
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
              }
            `}
          >
            <Zap className="w-4 h-4" />
            <span>{isMatching ? 'マッチング中...' : 'AIマッチング実行'}</span>
          </button>

          {hasMatches && (
            <button
              onClick={confirmMatchingResults}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span>マッチング結果を確定</span>
            </button>
          )}
        </div>

        {/* マッチング結果の表示 */}
        {hasMatches && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-purple-800">
                AIマッチング結果 {dayMatches.length}件
              </h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dayMatches.map((match, index) => (
                <div key={index} className="bg-white rounded border p-3 text-sm">
                  <div className="font-semibold text-gray-800 mb-1">
                    {match.pharmacist.name} → {match.pharmacy.name}
                  </div>
                  <div className="text-gray-600 text-xs">
                    時間: {match.timeSlot.start}-{match.timeSlot.end}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 不足薬局の表示 */}
        {selectedDate && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-semibold text-red-800">不足薬局</h4>
            </div>
            <div className="text-sm text-gray-600">
              選択した日付の不足薬局情報がここに表示されます
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMatching;
