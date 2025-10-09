import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Send, Users, X } from 'lucide-react';

interface EmergencyShiftRequestProps {
  onClose: () => void;
}

export const EmergencyShiftRequest: React.FC<EmergencyShiftRequestProps> = ({
  onClose,
}) => {
  const [formData, setFormData] = useState({
    date: '',
    timeSlot: 'fullday',
    startTime: '',
    endTime: '',
    pharmacyId: '',
    storeName: '',
    targetType: 'all' as 'all' | 'specific' | 'nearby',
    targetUserIds: [] as string[],
    maxTravelMinutes: '30',
  });

  const [pharmacists, setPharmacists] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [storeStations, setStoreStations] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 薬剤師リストと薬局リストを取得
  useEffect(() => {
    loadPharmacists();
    loadPharmacies();
    loadStoreStations();
  }, []);

  const loadPharmacists = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email, line_user_id, nearest_station_name, line_notification_enabled')
        .eq('user_type', 'pharmacist')
        .order('name');

      if (!error && data) {
        setPharmacists(data);
      }
    } catch (error) {
      console.error('Error loading pharmacists:', error);
    }
  };

  const loadPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email, line_user_id')
        .eq('user_type', 'pharmacy')
        .order('name');

      if (!error && data) {
        setPharmacies(data);
      }
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    }
  };

  const loadStoreStations = async () => {
    try {
      const { data, error } = await supabase
        .from('store_stations')
        .select('*')
        .order('pharmacy_id, store_name');

      if (!error && data) {
        console.log('Store stations loaded:', data);
        setStoreStations(data);
      } else {
        console.error('Error loading store stations:', error);
      }
    } catch (error) {
      console.error('Error loading store stations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wjgterfwurmvosawzbjs.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-emergency-shift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            ...formData,
            maxTravelMinutes: parseInt(formData.maxTravelMinutes),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        alert(
          `緊急シフト依頼を送信しました！\n\n送信成功: ${data.sent}件\nスキップ: ${data.skipped}件\n失敗: ${data.failed}件`
        );
      } else {
        throw new Error(data.error || '送信に失敗しました');
      }
    } catch (error) {
      console.error('Error sending emergency request:', error);
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    
    if (name === 'pharmacyId') {
      const pharmacy = pharmacies.find(p => p.id === value);
      setSelectedPharmacy(pharmacy);
      setFormData((prev) => ({ ...prev, [name]: value, storeName: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };


  const linkedPharmacistsCount = pharmacists.filter((p) => p.line_user_id).length;
  
  // デバッグ情報を追加
  console.log('Pharmacists loaded:', pharmacists);
  console.log('Linked pharmacists:', pharmacists.filter((p) => p.line_user_id));
  console.log('Linked count:', linkedPharmacistsCount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">緊急シフト募集</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">シフト情報</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日付 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  時間帯
                </label>
                <select
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="morning">午前</option>
                  <option value="afternoon">午後</option>
                  <option value="fullday">終日</option>
                  <option value="negotiable">要相談</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  薬局 <span className="text-red-500">*</span>
                </label>
                <select
                  name="pharmacyId"
                  value={formData.pharmacyId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">薬局を選択してください</option>
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <select
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  required
                  disabled={!formData.pharmacyId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">
                    {formData.pharmacyId ? '店舗を選択してください' : 'まず薬局を選択してください'}
                  </option>
                  {selectedPharmacy && (
                    <>
                      {/* 本店を追加 */}
                      <option value={selectedPharmacy.name}>
                        {selectedPharmacy.name}（本店）
                      </option>
                      {/* データベースから店舗情報を取得 */}
                      {(() => {
                        const pharmacyStores = storeStations.filter(store => store.pharmacy_id === formData.pharmacyId);
                        console.log('Pharmacy stores for', formData.pharmacyId, ':', pharmacyStores);
                        return pharmacyStores.map(store => (
                          <option key={store.id} value={store.store_name}>
                            {store.store_name} - {store.nearest_station_name}駅
                          </option>
                        ));
                      })()}
                      {/* 店舗情報がない場合のフォールバック */}
                      {storeStations.filter(store => store.pharmacy_id === formData.pharmacyId).length === 0 && (
                        <>
                          <option value="" disabled>
                            ⚠️ データベースに店舗情報がありません
                          </option>
                          <option value={`${selectedPharmacy.name} 渋谷店`}>
                            {selectedPharmacy.name} 渋谷店 - 渋谷駅 (テスト用)
                          </option>
                          <option value={`${selectedPharmacy.name} 新宿店`}>
                            {selectedPharmacy.name} 新宿店 - 新宿駅 (テスト用)
                          </option>
                          <option value={`${selectedPharmacy.name} 池袋店`}>
                            {selectedPharmacy.name} 池袋店 - 池袋駅 (テスト用)
                          </option>
                        </>
                      )}
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 送信先選択 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">送信先</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="targetType"
                  value="all"
                  checked={formData.targetType === 'all'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  全ての薬剤師（LINE連携済み: {linkedPharmacistsCount}名）
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="targetType"
                  value="specific"
                  checked={formData.targetType === 'specific'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  特定の薬剤師を選択
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="targetType"
                  value="nearby"
                  checked={formData.targetType === 'nearby'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  近隣の薬剤師（最寄り駅から）
                </span>
              </label>
            </div>

            {formData.targetType === 'specific' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  薬剤師を選択してください（複数選択可）
                </label>
                <select
                  multiple
                  size={5}
                  value={formData.targetUserIds}
                  onChange={(e) => {
                    const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, targetUserIds: selectedIds }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {pharmacists.map((pharmacist) => (
                    <option key={pharmacist.id} value={pharmacist.id}>
                      {pharmacist.name} 
                      {pharmacist.nearest_station_name && ` (${pharmacist.nearest_station_name}駅)`}
                      {!pharmacist.line_user_id && ' [LINE未連携]'}
                      {pharmacist.line_notification_enabled === false && ' [通知OFF]'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Ctrlキー（Mac: Cmdキー）を押しながらクリックで複数選択
                </p>
              </div>
            )}

            {formData.targetType === 'nearby' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    📍 店舗情報から自動で最寄り駅を読み取ります
                  </p>
                  {formData.storeName && selectedPharmacy ? (
                    <div className="text-sm text-blue-700">
                      <p><strong>選択店舗:</strong> {formData.storeName}</p>
                      <p><strong>最寄り駅:</strong> 
                        {(() => {
                          if (formData.storeName === selectedPharmacy.name) {
                            // 本店の場合、薬局の最寄り駅を使用
                            return selectedPharmacy.nearest_station_name ? ` ${selectedPharmacy.nearest_station_name}駅` : ' 未設定';
                          } else {
                            // 支店の場合、store_stationsから取得
                            const storeStation = storeStations.find(
                              store => store.pharmacy_id === formData.pharmacyId && store.store_name === formData.storeName
                            );
                            return storeStation ? ` ${storeStation.nearest_station_name}駅` : ' 未設定';
                          }
                        })()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-blue-600">まず薬局と店舗を選択してください</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大移動時間（分）
                  </label>
                  <input
                    type="number"
                    name="maxTravelMinutes"
                    value={formData.maxTravelMinutes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 送信結果 */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">送信完了</p>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ 送信成功: {result.sent}件</p>
                {result.skipped > 0 && <p>⚠️ スキップ: {result.skipped}件</p>}
                {result.failed > 0 && <p>❌ 失敗: {result.failed}件</p>}
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={sending || !formData.date || !formData.pharmacyId || !formData.storeName}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  緊急募集を送信
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

