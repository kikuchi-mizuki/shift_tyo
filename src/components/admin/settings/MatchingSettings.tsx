/**
 * MatchingSettings.tsx
 * マッチングスコアの重み設定を管理画面から変更するコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ScoreConfig {
  id: string;
  weight_rating: number;
  weight_distance: number;
  weight_request_count: number;
  weight_acceptance_rate: number;
  request_count_order: 'asc' | 'desc';
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

const DEFAULT_CONFIG: Omit<ScoreConfig, 'id' | 'updated_at'> = {
  weight_rating: 0.30,
  weight_distance: 0.30,
  weight_request_count: 0.20,
  weight_acceptance_rate: 0.20,
  request_count_order: 'desc',
  description: null,
  is_active: true,
};

const WEIGHT_LABELS: { key: keyof Pick<ScoreConfig, 'weight_rating' | 'weight_distance' | 'weight_request_count' | 'weight_acceptance_rate'>; label: string; description: string; color: string }[] = [
  { key: 'weight_rating', label: '薬剤師評価（評判）', description: '薬局からの評価が高い薬剤師を優先', color: 'bg-yellow-500' },
  { key: 'weight_distance', label: '距離（通勤のしやすさ）', description: '薬局に近い薬剤師を優先', color: 'bg-blue-500' },
  { key: 'weight_request_count', label: '応募回数', description: '応募回数に基づく優先度', color: 'bg-green-500' },
  { key: 'weight_acceptance_rate', label: '承諾率', description: 'お願いを多く受けてくださる薬剤師を優先', color: 'bg-purple-500' },
];

export const MatchingSettings: React.FC = () => {
  const [config, setConfig] = useState<ScoreConfig | null>(null);
  const [editConfig, setEditConfig] = useState<Omit<ScoreConfig, 'id' | 'updated_at'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 設定を読み込み
  const loadConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matching_score_config')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('設定読み込みエラー:', error);
        // テーブルが存在しない場合はデフォルト値を使用
        setEditConfig({ ...DEFAULT_CONFIG });
        setLoading(false);
        return;
      }

      setConfig(data);
      setEditConfig({
        weight_rating: Number(data.weight_rating),
        weight_distance: Number(data.weight_distance),
        weight_request_count: Number(data.weight_request_count),
        weight_acceptance_rate: Number(data.weight_acceptance_rate),
        request_count_order: data.request_count_order,
        description: data.description,
        is_active: data.is_active,
      });
    } catch (err) {
      console.error('設定読み込みエラー:', err);
      setEditConfig({ ...DEFAULT_CONFIG });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 重みの変更ハンドラー（合計が1.0になるよう自動調整）
  const handleWeightChange = (key: string, value: number) => {
    if (!editConfig) return;

    const newValue = Math.max(0, Math.min(1, value));
    const otherKeys = WEIGHT_LABELS.map(w => w.key).filter(k => k !== key);

    // 他の重みの現在の合計
    const otherTotal = otherKeys.reduce((sum, k) => sum + (editConfig[k] as number), 0);

    // 残り（他の重みに分配する量）
    const remaining = Math.max(0, 1 - newValue);

    // 他の重みを比率を保って調整
    const newConfig = { ...editConfig, [key]: newValue };

    if (otherTotal > 0) {
      for (const k of otherKeys) {
        const ratio = (editConfig[k] as number) / otherTotal;
        (newConfig as any)[k] = Math.round(remaining * ratio * 100) / 100;
      }
    } else {
      // 他が全て0の場合は均等に分配
      const equalShare = Math.round((remaining / otherKeys.length) * 100) / 100;
      for (const k of otherKeys) {
        (newConfig as any)[k] = equalShare;
      }
    }

    // 丸め誤差を補正（合計が1.0になるよう最後の項目で調整）
    const total = WEIGHT_LABELS.reduce((sum, w) => sum + ((newConfig as any)[w.key] as number), 0);
    const diff = Math.round((1 - total) * 100) / 100;
    if (Math.abs(diff) > 0.001) {
      const lastOtherKey = otherKeys[otherKeys.length - 1];
      (newConfig as any)[lastOtherKey] = Math.max(0, Math.round(((newConfig as any)[lastOtherKey] + diff) * 100) / 100);
    }

    setEditConfig(newConfig);
  };

  // 保存
  const handleSave = async () => {
    if (!editConfig) return;
    setSaving(true);
    setMessage(null);

    try {
      // 合計チェック
      const total = WEIGHT_LABELS.reduce((sum, w) => sum + (editConfig[w.key] as number), 0);
      if (Math.abs(total - 1) > 0.05) {
        setMessage({ type: 'error', text: `重みの合計が100%になりません（現在: ${Math.round(total * 100)}%）` });
        setSaving(false);
        return;
      }

      if (config?.id) {
        // 既存レコードを更新
        const { error } = await supabase
          .from('matching_score_config')
          .update({
            weight_rating: editConfig.weight_rating,
            weight_distance: editConfig.weight_distance,
            weight_request_count: editConfig.weight_request_count,
            weight_acceptance_rate: editConfig.weight_acceptance_rate,
            request_count_order: editConfig.request_count_order,
            description: editConfig.description,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // 新規作成
        const { error } = await supabase
          .from('matching_score_config')
          .insert({
            weight_rating: editConfig.weight_rating,
            weight_distance: editConfig.weight_distance,
            weight_request_count: editConfig.weight_request_count,
            weight_acceptance_rate: editConfig.weight_acceptance_rate,
            request_count_order: editConfig.request_count_order,
            description: editConfig.description,
            is_active: true,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: '設定を保存しました。次回のマッチングから反映されます。' });
      await loadConfig();
    } catch (err: any) {
      console.error('保存エラー:', err);
      setMessage({ type: 'error', text: `保存に失敗しました: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // デフォルトにリセット
  const handleReset = () => {
    setEditConfig({ ...DEFAULT_CONFIG });
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!editConfig) return null;

  const totalWeight = WEIGHT_LABELS.reduce((sum, w) => sum + (editConfig[w.key] as number), 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ヘッダー（クリックで開閉） */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">マッチング優先順位設定</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* 設定パネル（展開時） */}
      {expanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* 説明 */}
          <p className="text-xs text-gray-500">
            各項目のスライダーを調整して優先順位を設定します。合計は自動的に100%に調整されます。
          </p>

          {/* 重みスライダー */}
          {WEIGHT_LABELS.map(({ key, label, description, color }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
                <span className="text-sm font-bold text-gray-800 min-w-[40px] text-right">
                  {Math.round((editConfig[key] as number) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`}></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round((editConfig[key] as number) * 100)}
                  onChange={(e) => handleWeightChange(key, Number(e.target.value) / 100)}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          ))}

          {/* 重みバーのプレビュー */}
          <div className="flex h-3 rounded-full overflow-hidden border border-gray-200">
            {WEIGHT_LABELS.map(({ key, color }) => {
              const pct = (editConfig[key] as number) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  className={`${color} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>合計: {Math.round(totalWeight * 100)}%</span>
            <div className="flex gap-3">
              {WEIGHT_LABELS.map(({ key, label, color }) => (
                <span key={key} className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${color}`}></span>
                  {label.substring(0, 2)}
                </span>
              ))}
            </div>
          </div>

          {/* 応募回数の順序 */}
          <div className="bg-gray-50 rounded p-2">
            <div className="text-xs font-medium text-gray-700 mb-1">応募回数の優先順序</div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditConfig({ ...editConfig, request_count_order: 'desc' })}
                className={`flex-1 text-xs py-1.5 rounded ${
                  editConfig.request_count_order === 'desc'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                多い方が優先
              </button>
              <button
                onClick={() => setEditConfig({ ...editConfig, request_count_order: 'asc' })}
                className={`flex-1 text-xs py-1.5 rounded ${
                  editConfig.request_count_order === 'asc'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                少ない方が優先
              </button>
            </div>
          </div>

          {/* メッセージ */}
          {message && (
            <div className={`text-xs p-2 rounded ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="w-3 h-3" />
              初期値に戻す
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <Save className="w-3 h-3" />
              )}
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>

          {/* 最終更新日時 */}
          {config?.updated_at && (
            <p className="text-[10px] text-gray-400 text-right">
              最終更新: {new Date(config.updated_at).toLocaleString('ja-JP')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
