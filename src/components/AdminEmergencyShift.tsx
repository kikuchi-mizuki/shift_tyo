import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, Users, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminEmergencyShiftProps {
  user: any;
}

interface EmergencyShift {
  id: string;
  pharmacy_id: string;
  date: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  required_staff: number;
  store_name: string;
  pharmacy_name: string;
  memo: string;
  is_emergency: boolean;
  created_at: string;
  urgency_level: 'high' | 'medium' | 'low';
  notification_sent: boolean;
  response_count: number;
}

export function AdminEmergencyShift({ user }: AdminEmergencyShiftProps) {
  const [emergencyShifts, setEmergencyShifts] = useState<EmergencyShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<EmergencyShift | null>(null);
  const [targetType, setTargetType] = useState<'all' | 'specific' | 'nearby'>('all');
  const [selectedPharmacists, setSelectedPharmacists] = useState<string[]>([]);
  const [pharmacistsList, setPharmacistsList] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadEmergencyShifts();
    loadPharmacists();
  }, []);

  const loadEmergencyShifts = async () => {
    try {
      setLoading(true);

      // Load emergency shifts (shifts marked as is_emergency = true)
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_postings')
        .select('*')
        .eq('is_emergency', true)
        .order('created_at', { ascending: false });

      if (shiftsError) {
        console.error('Error loading emergency shifts:', shiftsError);
        return;
      }

      // Load pharmacy profiles for each shift
      const pharmacyIds = [...new Set(shiftsData?.map(s => s.pharmacy_id) || [])];
      const { data: pharmaciesData } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', pharmacyIds);

      const pharmaciesMap = (pharmaciesData || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      // Load response counts (assigned_shifts for each emergency shift)
      const shiftIds = shiftsData?.map(s => s.id) || [];
      const { data: responsesData } = await supabase
        .from('assigned_shifts')
        .select('shift_posting_id')
        .in('shift_posting_id', shiftIds);

      const responseCounts = (responsesData || []).reduce((acc: any, r: any) => {
        acc[r.shift_posting_id] = (acc[r.shift_posting_id] || 0) + 1;
        return acc;
      }, {});

      const enrichedShifts: EmergencyShift[] = (shiftsData || []).map(shift => ({
        ...shift,
        pharmacy_name: pharmaciesMap[shift.pharmacy_id]?.name || '薬局名未設定',
        urgency_level: shift.urgency_level || 'medium',
        notification_sent: shift.notification_sent || false,
        response_count: responseCounts[shift.id] || 0
      }));

      setEmergencyShifts(enrichedShifts);
    } catch (error) {
      console.error('Failed to load emergency shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacists = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_type', 'pharmacist')
        .order('name');

      if (error) {
        console.error('Error loading pharmacists:', error);
        return;
      }

      setPharmacistsList(data || []);
    } catch (error) {
      console.error('Failed to load pharmacists:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedShift) {
      alert('シフトを選択してください');
      return;
    }

    if (targetType === 'specific' && selectedPharmacists.length === 0) {
      alert('通知対象の薬剤師を選択してください');
      return;
    }

    setSending(true);
    try {
      // Call Edge Function to send emergency shift notification
      const { data, error } = await supabase.functions.invoke('send-emergency-shift', {
        body: {
          shiftId: selectedShift.id,
          targetType: targetType,
          targetIds: targetType === 'specific' ? selectedPharmacists : undefined
        }
      });

      if (error) {
        throw error;
      }

      // Update notification_sent flag
      await supabase
        .from('shift_postings')
        .update({ notification_sent: true })
        .eq('id', selectedShift.id);

      alert('緊急通知を送信しました');
      setSelectedShift(null);
      setSelectedPharmacists([]);
      loadEmergencyShifts();
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      alert(`通知の送信に失敗しました: ${error.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const getTimeDisplay = (shift: EmergencyShift) => {
    if (shift.start_time && shift.end_time) {
      return `${shift.start_time.substring(0, 5)}-${shift.end_time.substring(0, 5)}`;
    }
    if (shift.time_slot === 'morning') return '9:00-13:00';
    if (shift.time_slot === 'afternoon') return '13:00-18:00';
    if (shift.time_slot === 'fullday') return '9:00-18:00';
    return '時間未設定';
  };

  const getUrgencyColor = (level: 'high' | 'medium' | 'low') => {
    if (level === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'medium') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getUrgencyLabel = (level: 'high' | 'medium' | 'low') => {
    if (level === 'high') return '緊急';
    if (level === 'medium') return '中';
    return '低';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">緊急シフト管理</h1>
            <p className="text-sm text-red-100 mt-1">
              緊急シフトの状況確認と通知送信
            </p>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">緊急シフト総数</div>
              <div className="text-2xl font-bold text-gray-900">{emergencyShifts.length}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">通知未送信</div>
              <div className="text-2xl font-bold text-gray-900">
                {emergencyShifts.filter(s => !s.notification_sent).length}
              </div>
            </div>
            <Send className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">応募あり</div>
              <div className="text-2xl font-bold text-gray-900">
                {emergencyShifts.filter(s => s.response_count > 0).length}
              </div>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* 緊急シフト一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">緊急シフト一覧</h2>
        </div>

        <div className="divide-y">
          {emergencyShifts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              緊急シフトはありません
            </div>
          ) : (
            emergencyShifts.map(shift => (
              <div key={shift.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(shift.urgency_level)}`}>
                        {getUrgencyLabel(shift.urgency_level)}
                      </span>
                      {shift.notification_sent && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                          通知送信済み
                        </span>
                      )}
                      {shift.response_count > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
                          応募 {shift.response_count}件
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {shift.pharmacy_name} - {shift.store_name || '店舗名未設定'}
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{shift.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeDisplay(shift)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{shift.required_staff}人必要</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        登録: {new Date(shift.created_at).toLocaleString('ja-JP')}
                      </div>
                    </div>

                    {shift.memo && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {shift.memo}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedShift(shift)}
                    disabled={shift.notification_sent}
                    className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      shift.notification_sent
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {shift.notification_sent ? '送信済み' : '通知送信'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 通知送信モーダル */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">緊急通知送信</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* シフト情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">シフト情報</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>薬局: {selectedShift.pharmacy_name}</div>
                  <div>店舗: {selectedShift.store_name || '店舗名未設定'}</div>
                  <div>日時: {selectedShift.date} {getTimeDisplay(selectedShift)}</div>
                  <div>必要人数: {selectedShift.required_staff}人</div>
                </div>
              </div>

              {/* 通知対象選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  通知対象
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetType"
                      value="all"
                      checked={targetType === 'all'}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">全ての薬剤師</div>
                      <div className="text-xs text-gray-500">登録されている全ての薬剤師に通知</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetType"
                      value="nearby"
                      checked={targetType === 'nearby'}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">近隣の薬剤師</div>
                      <div className="text-xs text-gray-500">薬局の近くにいる薬剤師に通知</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetType"
                      value="specific"
                      checked={targetType === 'specific'}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">特定の薬剤師</div>
                      <div className="text-xs text-gray-500">選択した薬剤師のみに通知</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 特定薬剤師選択 */}
              {targetType === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    薬剤師を選択
                  </label>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {pharmacistsList.map(pharmacist => (
                      <label
                        key={pharmacist.id}
                        className="flex items-center space-x-2 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPharmacists.includes(pharmacist.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPharmacists([...selectedPharmacists, pharmacist.id]);
                            } else {
                              setSelectedPharmacists(selectedPharmacists.filter(id => id !== pharmacist.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{pharmacist.name || pharmacist.email}</div>
                          {pharmacist.nearest_station_name && (
                            <div className="text-xs text-gray-500">
                              最寄駅: {pharmacist.nearest_station_name}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    選択中: {selectedPharmacists.length}人
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setSelectedPharmacists([]);
                }}
                disabled={sending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>送信中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>緊急通知を送信</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
