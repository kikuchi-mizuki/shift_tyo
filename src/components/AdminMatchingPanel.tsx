import React from 'react';
import { Brain, Zap, AlertCircle, Star } from 'lucide-react';

interface AdminMatchingPanelProps {
  selectedDate: string;
  requests: any[];
  postings: any[];
  aiMatches: any[];
  useAIMatching: boolean;
  aiMatchingLoading: boolean;
  onRunMatching: () => void;
  onConfirmMatch: (match: any) => void;
  onCancelMatch: (match: any) => void;
  onToggleAIMatching: () => void;
}

const AdminMatchingPanel: React.FC<AdminMatchingPanelProps> = ({
  selectedDate,
  requests,
  postings,
  aiMatches,
  useAIMatching,
  aiMatchingLoading,
  onRunMatching,
  onConfirmMatch,
  onCancelMatch,
  onToggleAIMatching
}) => {
  if (!selectedDate) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>日付を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* マッチング制御パネル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            マッチング制御
          </h3>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useAIMatching}
                onChange={onToggleAIMatching}
                className="mr-2"
              />
              <span className="text-sm">AIマッチング</span>
            </label>
            
            <button
              onClick={onRunMatching}
              disabled={aiMatchingLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {aiMatchingLoading ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  マッチング実行
                </>
              )}
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">リクエスト</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{requests.length}</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">ポスティング</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{postings.length}</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">AIマッチ</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{aiMatches.length}</div>
          </div>
        </div>
      </div>

      {/* AIマッチング結果 */}
      {useAIMatching && aiMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            AIマッチング結果
          </h3>
          
          <div className="space-y-3">
            {aiMatches.map((match, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="font-medium">薬剤師:</span> {match.pharmacist_name}
                      </div>
                      <div>
                        <span className="font-medium">薬局:</span> {match.pharmacy_name}
                      </div>
                      <div>
                        <span className="font-medium">時間:</span> {match.start_time} - {match.end_time}
                      </div>
                      <div>
                        <span className="font-medium">時給:</span> ¥{match.hourly_rate}
                      </div>
                    </div>
                    
                    {match.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">備考:</span> {match.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onConfirmMatch(match)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => onCancelMatch(match)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 手動マッチング結果 */}
      {!useAIMatching && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">手動マッチング</h3>
          <div className="text-center text-gray-500">
            <p>手動マッチング機能は開発中です</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatchingPanel;