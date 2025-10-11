import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmergencyShiftRequest } from './EmergencyShiftRequest';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboardMinimal: React.FC<AdminDashboardProps> = ({ user }) => {
  // 最小限のstateのみ
  const [loading, setLoading] = useState(true);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 最小限のデータ読み込み
        console.log('データ読み込み開始');
        
      } catch (error) {
        console.error('データ読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">データを読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AIシフトマネージャー</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Bell className="w-4 h-4" />
              <span>緊急シフト募集</span>
            </button>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">管理画面</h2>
          <p className="text-gray-600">管理画面が正常に表示されています。</p>
        </div>
      </div>

      {/* 緊急シフトモーダル */}
      {showEmergencyModal && (
        <EmergencyShiftRequest
          user={user}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboardMinimal;
