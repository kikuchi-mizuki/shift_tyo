import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmergencyShiftRequest } from './EmergencyShiftRequest';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboardSimple: React.FC<AdminDashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 安全な配列アクセスのためのヘルパー関数
  const safeArray = (arr: any) => {
    if (arr === null || arr === undefined) return [];
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'object' && arr.length !== undefined) return Array.from(arr);
    return [];
  };

  const safeLength = (arr: any) => safeArray(arr).length;

  const safeObject = (obj: any) => {
    if (obj === null || obj === undefined) return {};
    if (typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return {};
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 基本的なデータ読み込みのみ
        console.log('AdminDashboard: 初期化開始');
        
        // ユーザープロフィールの基本情報のみ取得
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, name, user_type')
          .limit(10); // 制限を設けて安全に

        if (profilesError) {
          console.error('Profiles error:', profilesError);
          setError('ユーザープロフィールの読み込みに失敗しました');
          return;
        }

        console.log('AdminDashboard: 初期化完了', {
          profilesCount: safeLength(profiles),
          user: user?.email || 'unknown'
        });

      } catch (err) {
        console.error('AdminDashboard initialization error:', err);
        setError(err instanceof Error ? err.message : '初期化中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">管理画面を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                管理画面のエラー
              </h3>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">{error}</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  AIシフトマネージャー - 管理画面
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>緊急シフト依頼</span>
              </button>
              
              <div className="text-sm text-gray-600">
                {user?.email || 'unknown'} - 管理
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <Brain className="h-8 w-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              管理ダッシュボード
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* システムステータス */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-blue-900">
                    システムステータス
                  </h3>
                  <p className="text-blue-700">正常稼働中</p>
                </div>
              </div>
            </div>

            {/* 緊急シフト依頼 */}
            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Bell className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-red-900">
                    緊急シフト依頼
                  </h3>
                  <button
                    onClick={() => setShowEmergencyModal(true)}
                    className="text-red-700 hover:text-red-800 underline"
                  >
                    新しい依頼を作成
                  </button>
                </div>
              </div>
            </div>

            {/* カレンダー */}
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-green-900">
                    今日の日付
                  </h3>
                  <p className="text-green-700">
                    {currentDate.toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              システム情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ユーザー:</p>
                <p className="font-medium">{user?.email || 'unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ロール:</p>
                <p className="font-medium">管理者</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">最終更新:</p>
                <p className="font-medium">{new Date().toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ステータス:</p>
                <p className="font-medium text-green-600">正常</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 緊急シフト依頼モーダル */}
      {showEmergencyModal && (
        <EmergencyShiftRequest onClose={() => setShowEmergencyModal(false)} />
      )}
    </div>
  );
};

export default AdminDashboardSimple;
