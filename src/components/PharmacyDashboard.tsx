import React, { useState, useEffect } from 'react';
import { Building2, Calendar, Users, Clock, Plus, Search } from 'lucide-react';
import { shifts, shiftPostings } from '../lib/supabase';

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [myShifts, setMyShifts] = useState([]);
  const [availablePharmacists, setAvailablePharmacists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // 自分の薬局のシフトを取得
      const { data: myShiftsData } = await shifts.getShiftsByUser(user.id, 'pharmacy');
      setMyShifts(myShiftsData || []);

      // 利用可能な薬剤師を取得（仮のデータ）
      setAvailablePharmacists([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">薬局ダッシュボード</h1>
            <p className="text-gray-600">シフト募集と薬剤師管理</p>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">今月のシフト</p>
              <p className="text-2xl font-bold text-gray-900">{myShifts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">登録薬剤師</p>
              <p className="text-2xl font-bold text-gray-900">0名</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">未確定シフト</p>
              <p className="text-2xl font-bold text-gray-900">0件</p>
            </div>
          </div>
        </div>
      </div>

      {/* 今月のシフト */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">今月のシフト</h2>
        </div>
        <div className="p-6">
          {myShifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">今月のシフトはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myShifts.map((shift: any) => (
                <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{shift.pharmacist_name || '未割り当て'}</h3>
                      <p className="text-sm text-gray-600">{shift.date} {shift.start_time} - {shift.end_time}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shift.pharmacist_id ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shift.pharmacist_id ? '確定' : '未確定'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* シフト募集 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">シフト募集</h2>
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              <span>新規募集</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">薬剤師を募集して、シフトを埋めましょう。</p>
        </div>
      </div>

      {/* 利用可能な薬剤師 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">利用可能な薬剤師</h2>
        </div>
        <div className="p-6">
          {availablePharmacists.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">現在利用可能な薬剤師はいません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availablePharmacists.map((pharmacist: any) => (
                <div key={pharmacist.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{pharmacist.name}</h3>
                      <p className="text-sm text-gray-600">{pharmacist.experience}年経験</p>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      連絡する
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
