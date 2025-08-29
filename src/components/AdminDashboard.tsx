import React, { useState, useEffect } from 'react';
import { Calendar, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { shifts } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmedShifts, setConfirmedShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('confirmed'); // 'pending' | 'confirmed'
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadConfirmedShifts();
  }, [user, currentDate]);

  const loadConfirmedShifts = async () => {
    try {
      // 確定済みシフトを取得
      const { data: shiftsData } = await shifts.getConfirmedShifts();
      setConfirmedShifts(shiftsData || []);
    } catch (error) {
      console.error('Error loading confirmed shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getShiftForDate = (day: number) => {
    if (!day) return null;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return confirmedShifts.find((shift: any) => shift.date === date);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // "HH:MM"形式に変換
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
      {/* システム状態アラート */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">システム状態: シフト確定済み</h3>
            <p className="text-sm text-blue-700 mt-1">
              シフトが確定しました。変更が必要な場合は管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左側: カレンダー */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>
          </div>
          
          <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              const shift = getShiftForDate(day);
              return (
                <div
                  key={index}
                  className={`p-2 text-center text-sm border border-gray-200 min-h-[80px] ${
                    day ? 'hover:bg-gray-50' : 'bg-gray-50'
                  }`}
                >
                  {day && (
                    <>
                      <div className="font-medium">{day}</div>
                      {shift && (
                        <div className="mt-1 text-xs">
                          <div className="bg-green-100 text-green-800 rounded px-1 py-0.5 mb-1">
                            {shift.pharmacist_name}
                          </div>
                          <div className="text-gray-600">
                            {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
                          </div>
                          <div className="text-gray-500">
                            {shift.pharmacy_name}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側: 管理者パネル */}
        <div className="w-96 bg-white rounded-lg shadow border border-purple-200">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-semibold">管理者パネル</h2>
            </div>
            <p className="text-sm text-purple-100 mt-1">システム全体の状態管理と調整</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* システム操作 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">システム操作</h3>
              
              <div className="space-y-4">
                <button
                  disabled={systemStatus === 'confirmed'}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                    systemStatus === 'confirmed'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>シフト確定済み</span>
                </button>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    注意: シフト確定を実行すると、現在の仮シフトが最終確定され、変更できなくなります。慎重に実行してください。
                  </p>
                </div>
                
                <div className="text-xs text-gray-500">
                  最終更新: {lastUpdated.toLocaleString('ja-JP')}
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">統計情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{confirmedShifts.length}</div>
                  <div className="text-sm text-blue-800">確定シフト数</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(confirmedShifts.map((shift: any) => shift.pharmacist_id)).size}
                  </div>
                  <div className="text-sm text-green-800">参加薬剤師数</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
