import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Send, Users, X } from 'lucide-react';

interface EmergencyShiftRequestProps {
  onClose: () => void;
}

const EmergencyShiftRequest: React.FC<EmergencyShiftRequestProps> = ({
  onClose,
}) => {
  // より確実なログ出力
  console.error('=== EMERGENCY SHIFT REQUEST COMPONENT INITIALIZED ===');
  console.error('Component props:', { onClose });
  console.error('Component is now rendering...');
  
  // alertでも確認
  if (typeof window !== 'undefined') {
    console.warn('EmergencyShiftRequest component loaded');
  }
  
  const [formData, setFormData] = useState({
    date: '',
    timeSlot: 'fullday',
    startTime: '',
    endTime: '',
  });

  const [pharmacists, setPharmacists] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 薬剤師リストを取得
  useEffect(() => {
    loadPharmacists();
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


  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== HANDLE SUBMIT CALLED ===');
    e.preventDefault();
    console.log('=== Emergency Shift Request Started ===');
    console.log('Form data:', formData);
    
    // フォームバリデーション
    if (!formData.date) {
      console.log('Form validation failed:', {
        date: formData.date
      });
      alert('日付を入力してください');
      return;
    }
    
    setSending(true);
    setResult(null);
    

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wjgterfwurmvosawzbjs.supabase.co';
      
      // 現在のユーザーセッションから認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!authToken) {
        throw new Error('認証トークンが取得できませんでした。環境変数 VITE_SUPABASE_ANON_KEY を設定してください。');
      }
      
      console.log('Using auth token:', authToken ? 'Present' : 'Missing');
      console.log('Token type:', session ? 'Session token' : 'Anon key');

      const requestBody = {
        ...formData,
        targetType: 'all', // 常に全ての薬剤師に送信
      };
      
      console.log('Request body before sending:', requestBody);
      

      console.log('Sending request to:', `${supabaseUrl}/functions/v1/send-emergency-shift`);
      console.log('Request body:', requestBody);
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-emergency-shift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);

      
      if (response.ok) {
        setResult(data);
        // Edge Functionのレスポンス形式に合わせて修正
        const sentCount = data.sent || 0;
        const skippedCount = data.skipped || 0;
        const failedCount = data.failed || 0;
        const totalCount = data.total || (sentCount + skippedCount + failedCount);
        
        console.log('Emergency shift response:', {
          success: data.success,
          sent: sentCount,
          skipped: skippedCount,
          failed: failedCount,
          total: totalCount
        });
        
        // LINE APIが成功している場合、結果を正しく表示
        if (data.success && sentCount > 0) {
          console.log('LINE notifications sent successfully');
        } else if (data.success && failedCount > 0) {
          console.log('Some LINE notifications failed');
        }
        
        
        alert(
          `緊急シフト依頼を送信しました！\n\n対象: ${totalCount}名\n送信成功: ${sentCount}件\nスキップ: ${skippedCount}件\n失敗: ${failedCount}件`
        );
      } else {
        // エラー情報をデバッグ情報に追加
        console.error('Emergency shift request failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const linkedPharmacistsCount = pharmacists.filter((p) => p.line_user_id).length;
  
  // デバッグ情報を追加
  console.log('Pharmacists loaded:', pharmacists);
  console.log('Linked pharmacists:', pharmacists.filter((p) => p.line_user_id));
  console.log('Linked count:', linkedPharmacistsCount);

  console.error('=== RENDERING EMERGENCY SHIFT REQUEST MODAL ===');
  console.error('Form data state:', formData);
  console.error('Sending state:', sending);
  console.error('Result state:', result);
  
  // より目立つログ
  console.warn('EmergencyShiftRequest is rendering!');
  console.info('Modal should be visible now');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">緊急シフト募集</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
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

          </div>

          {/* 送信先 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">送信先</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800">
                全ての薬剤師（LINE連携済み: {linkedPharmacistsCount}名）に一斉通知します
              </p>
            </div>
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
              disabled={sending || !formData.date}
              onClick={(e) => {
                console.log('=== BUTTON CLICKED ===');
                console.log('Emergency shift button clicked!');
                console.log('Sending state:', sending);
                console.log('Form validation:', {
                  date: formData.date,
                  disabled: sending || !formData.date
                });
                
                // フォームが無効な場合は送信を停止
                if (sending || !formData.date) {
                  console.log('Form is invalid, preventing submission');
                  e.preventDefault();
                  return;
                }
                
                console.log('Form is valid, proceeding with submission');
              }}
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

export default EmergencyShiftRequest;

