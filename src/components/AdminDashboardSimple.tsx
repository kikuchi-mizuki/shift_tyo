import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, supabase, pharmacistRatings } from '../lib/supabase';
import { EmergencyShiftRequest } from './EmergencyShiftRequest';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboardSimple: React.FC<AdminDashboardProps> = ({ user }) => {
  // 基本的なstateのみを安全に初期化
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [assigned, setAssigned] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [postings, setPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // 安全な配列アクセスのためのヘルパー関数
  const safeArray = (arr: any) => {
    if (arr === null || arr === undefined) return [];
    if (Array.isArray(arr)) return arr;
    return [];
  };
  
  const safeLength = (arr: any) => {
    const safe = safeArray(arr);
    return safe.length;
  };
  
  // 安全なオブジェクトアクセスのためのヘルパー関数
  const safeObject = (obj: any) => {
    if (obj === null || obj === undefined) return {};
    if (typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return {};
  };

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // シフトデータを読み込み
        const [shiftsData, requestsData, postingsData, profilesData] = await Promise.all([
          shifts.select('*'),
          shiftRequests.select('*'),
          shiftPostings.select('*'),
          supabase.from('user_profiles').select('*')
        ]);

        if (shiftsData.data) setAssigned(shiftsData.data);
        if (requestsData.data) setRequests(requestsData.data);
        if (postingsData.data) setPostings(postingsData.data);
        if (profilesData.data) {
          const profilesMap: any = {};
          profilesData.data.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
          setUserProfiles(profilesMap);
        }
        
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

        {/* 基本統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">シフト希望</p>
                <p className="text-2xl font-semibold text-gray-900">{safeLength(requests)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">シフト募集</p>
                <p className="text-2xl font-semibold text-gray-900">{safeLength(postings)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">確定シフト</p>
                <p className="text-2xl font-semibold text-gray-900">{safeLength(assigned)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ユーザー数</p>
                <p className="text-2xl font-semibold text-gray-900">{Object.keys(safeObject(userProfiles)).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* データ表示 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">データ概要</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">シフト希望データ</h3>
                <p className="text-sm text-gray-600">{safeLength(requests)}件の希望があります</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">シフト募集データ</h3>
                <p className="text-sm text-gray-600">{safeLength(postings)}件の募集があります</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">確定シフトデータ</h3>
                <p className="text-sm text-gray-600">{safeLength(assigned)}件の確定シフトがあります</p>
              </div>
            </div>
          </div>
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

export default AdminDashboardSimple;
