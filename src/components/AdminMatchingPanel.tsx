import React, { useState } from 'react';
import { Play, CheckCircle, Calendar, Clock, Users, Hash } from 'lucide-react';
import { createStoreOpening, createAvailability, runMatching, confirmMatch, type Slot } from '../features/shifts/api';

interface AdminMatchingPanelProps {
  userRole: 'admin' | 'store' | 'pharmacist';
}

export const AdminMatchingPanel: React.FC<AdminMatchingPanelProps> = ({ userRole }) => {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<Slot>('am');
  const [requiredCount, setRequiredCount] = useState(1);
  const [matchId, setMatchId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const slots: { value: Slot; label: string; icon: string }[] = [
    { value: 'am', label: '午前', icon: '🌅' },
    { value: 'pm', label: '午後', icon: '☀️' },
    { value: 'full', label: '終日', icon: '🌞' }
  ];

  const handleCreateStoreOpening = async () => {
    if (!date) {
      alert('日付を選択してください');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createStoreOpening({ date, slot, requiredCount });
      alert(`募集を作成しました (ID: ${result.id})`);
    } catch (error) {
      alert(`募集作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAvailability = async () => {
    if (!date) {
      alert('日付を選択してください');
      return;
    }

    setIsLoading(true);
    try {
      await createAvailability({ date, slot });
      alert('希望を登録しました');
    } catch (error) {
      alert(`希望登録に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMatching = async () => {
    if (!date) {
      alert('日付を選択してください');
      return;
    }

    setIsLoading(true);
    try {
      await runMatching({ date, slot });
      alert('マッチング処理を実行しました');
    } catch (error) {
      alert(`マッチング実行に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMatch = async () => {
    if (!matchId || matchId === '') {
      alert('マッチIDを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const result = await confirmMatch({ matchId: Number(matchId) });
      alert(`マッチを確定しました (Status: ${result.status})`);
    } catch (error) {
      alert(`マッチ確定に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center space-x-3">
          <Play className="w-6 h-6" />
          <h2 className="text-2xl font-bold">マッチング管理パネル</h2>
        </div>
        <p className="text-purple-100 mt-2">募集作成からマッチング確定までの一連の操作</p>
      </div>

      <div className="p-6 space-y-6">
        {/* 共通入力フィールド */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              時間帯
            </label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as Slot)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {slots.map(s => (
                <option key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>

          {(userRole === 'admin' || userRole === 'store') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                必要人数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={requiredCount}
                onChange={(e) => setRequiredCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. 募集作成 - 管理者・店舗のみ */}
          {(userRole === 'admin' || userRole === 'store') && (
            <div className="p-4 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">1. 募集作成</h3>
              <p className="text-sm text-gray-600 mb-3">店舗の薬剤師募集を作成します</p>
              <button
                onClick={handleCreateStoreOpening}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '作成中...' : '募集を作成'}
              </button>
            </div>
          )}

          {/* 2. 希望登録 - 管理者・薬剤師のみ */}
          {(userRole === 'admin' || userRole === 'pharmacist') && (
            <div className="p-4 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">2. 希望登録</h3>
              <p className="text-sm text-gray-600 mb-3">薬剤師の勤務希望を登録します</p>
              <button
                onClick={handleCreateAvailability}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '登録中...' : '希望を登録'}
              </button>
            </div>
          )}

          {/* 3. マッチング実行 - 管理者のみ */}
          {userRole === 'admin' && (
            <div className="p-4 border border-orange-200 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">3. マッチング実行</h3>
              <p className="text-sm text-gray-600 mb-3">募集と希望のマッチング処理を実行します</p>
              <button
                onClick={handleRunMatching}
                disabled={isLoading}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4 inline mr-2" />
                {isLoading ? '実行中...' : 'マッチング実行'}
              </button>
            </div>
          )}

          {/* 4. マッチ確定 - 管理者のみ */}
          {userRole === 'admin' && (
            <div className="p-4 border border-purple-200 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">4. マッチ確定</h3>
              <p className="text-sm text-gray-600 mb-3">マッチング結果を確定します</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-4 h-4 inline mr-1" />
                    マッチID
                  </label>
                  <input
                    type="number"
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="マッチIDを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleConfirmMatch}
                  disabled={isLoading}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  {isLoading ? '確定中...' : 'マッチ確定'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 使用方法の説明 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">使用方法</h4>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. 日付・時間帯・必要人数を設定して「募集を作成」</li>
            <li>2. 同じ日付・時間帯で「希望を登録」（薬剤師として）</li>
            <li>3. 「マッチング実行」でシステムが自動マッチング</li>
            <li>4. 生成されたマッチIDを入力して「マッチ確定」</li>
          </ol>
          <p className="text-xs text-yellow-600 mt-2">
            ※ データベースに適切なテーブル（store_openings, availabilities, matches）とRPC関数（match_openings）が必要です
          </p>
        </div>
      </div>
    </div>
  );
};export default AdminMatchingPanel;
