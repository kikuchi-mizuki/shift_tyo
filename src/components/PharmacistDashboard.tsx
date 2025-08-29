import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Plus, Search } from 'lucide-react';
import { shifts, shiftRequests } from '../lib/supabase';

interface PharmacistDashboardProps {
  user: any;
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [myShifts, setMyShifts] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShifts();
  }, [user]);

  const loadShifts = async () => {
    try {
      // 自分のシフトを取得
      const { data: myShiftsData } = await shifts.getShiftsByUser(user.id, 'pharmacist');
      setMyShifts(myShiftsData || []);

      // 利用可能なシフトを取得
      const { data: availableData } = await shifts.getShifts();
      setAvailableShifts(availableData || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
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
          <User className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">薬剤師ダッシュボード</h1>
            <p className="text-gray-600">シフト管理と希望登録</p>
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
            <Clock className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総勤務時間</p>
              <p className="text-2xl font-bold text-gray-900">0時間</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">勤務薬局</p>
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
                      <h3 className="font-medium text-gray-900">{shift.pharmacy_name}</h3>
                      <p className="text-sm text-gray-600">{shift.date} {shift.start_time} - {shift.end_time}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      確定
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* シフト希望登録 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">シフト希望登録</h2>
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              <span>新規登録</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">シフト希望を登録して、より良い勤務スケジュールを作成しましょう。</p>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;
