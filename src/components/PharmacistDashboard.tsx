import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Sun, MessageCircle, Smile } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, testConnection } from '../lib/supabase';

interface PharmacistDashboardProps {
  user: any;
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('中優先度');
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [openPostings, setOpenPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadShifts();
    runConnectionTests();
  }, [user]);

  const runConnectionTests = async () => {
    console.log('Running connection tests...');
    const shiftRequestsTest = await testConnection.testShiftRequestsTable();
    const shiftPostingsTest = await testConnection.testShiftPostingsTable();
    
    const results = {
      shiftRequests: shiftRequestsTest,
      shiftPostings: shiftPostingsTest,
      timestamp: new Date().toISOString()
    };
    
    console.log('Connection test results:', results);
    setTestResults(results);
  };

  const loadShifts = async () => {
    try {
      const { data: myShiftsData } = await shifts.getShiftsByUser(user.id, 'pharmacist');
      setMyShifts(myShiftsData || []);
      const { data: reqs } = await shiftRequests.getRequests(user.id, 'pharmacist');
      setMyRequests(reqs || []);
      const { data: postings } = await shiftPostings.getPostings('', 'pharmacist');
      setOpenPostings(postings || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
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

  const handleDateSelect = (day: number) => {
    if (day) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      setSelectedDate(formattedDate);
    }
  };

  const handleSubmit = async () => {
    console.log('PharmacistDashboard: handleSubmit called');
    console.log('Form data:', { selectedDate, selectedTimeSlot, selectedPriority, memo, userId: user.id });
    
    if (!selectedDate || !selectedTimeSlot) {
      alert('日付と時間帯を選択してください');
      return;
    }

    try {
      const shiftRequest = {
        pharmacist_id: user.id,
        date: selectedDate,
        time_slot: selectedTimeSlot,
        priority: selectedPriority,
        memo: memo,
        status: 'pending'
      };

      console.log('Creating shift request:', shiftRequest);
      console.log('shiftRequests object:', shiftRequests);
      console.log('shiftRequests.createRequests function:', shiftRequests.createRequests);

      const { error } = await shiftRequests.createRequests([shiftRequest]);
      
      if (error) {
        console.error('Error creating shift request:', error);
        alert(`シフト希望の登録に失敗しました: ${error.message || error.code || 'Unknown error'}`);
      } else {
        console.log('Shift request created successfully');
        alert('シフト希望を登録しました');
        setSelectedDate('');
        setSelectedTimeSlot('');
        setMemo('');
        loadShifts();
      }
    } catch (error) {
      console.error('Error submitting shift request:', error);
      alert('シフト希望の登録に失敗しました');
    }
  };

  const timeSlots = [
    { id: 'morning', label: '午前 (9:00-13:00)', icon: Sun, color: 'bg-green-500 hover:bg-green-600' },
    { id: 'afternoon', label: '午後 (13:00-18:00)', icon: Sun, color: 'bg-orange-500 hover:bg-orange-600' },
    { id: 'full', label: '終日 (9:00-18:00)', icon: Smile, color: 'bg-yellow-500 hover:bg-yellow-600' },
    { id: 'consult', label: '要相談', icon: MessageCircle, color: 'bg-purple-500 hover:bg-purple-600' }
  ];

  const priorities = [
    { id: 'high', label: '高優先度', color: 'bg-red-500 hover:bg-red-600' },
    { id: 'medium', label: '中優先度', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { id: 'low', label: '低優先度', color: 'bg-blue-500 hover:bg-blue-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const y = currentDate.getFullYear();
  const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const hasMyRequest = (day: number) => myRequests.some((r: any) => r.date === `${y}-${m}-${day.toString().padStart(2, '0')}`);
  const hasPosting = (day: number) => openPostings.some((p: any) => p.date === `${y}-${m}-${day.toString().padStart(2, '0')}`);

  return (
    <div className="space-y-6">
      {/* 接続テスト結果 */}
      {testResults && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">データベース接続テスト結果</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg ${testResults.shiftRequests.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">shift_requests テーブル</div>
              <div className={`text-sm ${testResults.shiftRequests.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.shiftRequests.success ? '✅ 接続成功' : `❌ 接続失敗: ${testResults.shiftRequests.error}`}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${testResults.shiftPostings.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">shift_postings テーブル</div>
              <div className={`text-sm ${testResults.shiftPostings.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.shiftPostings.success ? '✅ 接続成功' : `❌ 接続失敗: ${testResults.shiftPostings.error}`}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            テスト実行時刻: {new Date(testResults.timestamp).toLocaleString('ja-JP')}
          </div>
        </div>
      )}
      
      <div className="flex gap-6 p-6">
        {/* 左側: カレンダー */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
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
          
          <div className="bg-blue-600 text-white px-5 py-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-white" />
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
            {getDaysInMonth(currentDate).map((day, index) => (
              <div
                key={index}
                className={`p-2 text-center text-sm border border-gray-200 min-h-[72px] ${
                  day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                } ${
                  selectedDate === `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day?.toString().padStart(2, '0')}`
                    ? 'bg-blue-100 border-blue-300'
                    : ''
                }`}
                onClick={() => handleDateSelect(day || 0)}
              >
                {day && (
                  <>
                    <div className="font-medium">{day}</div>
                    {myShifts.some((shift: any) => 
                      shift.date === `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                    ) && (
                      <div className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block">割当</div>
                    )}
                    {hasMyRequest(day) && (
                      <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">希望</div>
                    )}
                    {hasPosting(day) && (
                      <div className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 mt-1 inline-block">募集</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右側: シフト希望登録フォーム */}
        <div className="w-96 bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">シフト希望登録</h2>
            
            {/* 選択された日付 */}
            {selectedDate && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">
                  {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日
                </span>
              </div>
            )}

            {/* 日付選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                希望日
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">日付を選択してください</option>
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth() + 1;
                  const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  return (
                    <option key={day} value={date}>
                      {month}月{day}日
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 希望時間帯 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                希望時間帯
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => {
                  const Icon = slot.icon;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot.id)}
                      className={`flex items-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${
                        selectedTimeSlot === slot.id ? slot.color : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 優先度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                優先度
              </label>
              <div className="flex space-x-2">
                {priorities.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => setSelectedPriority(priority.label)}
                    className={`flex-1 py-2 px-3 rounded-lg text-white text-sm font-medium transition-colors ${
                      selectedPriority === priority.label ? priority.color : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ(任意)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="特別な要望や対応可能な業務があれば記入してください (例:在宅医療対応可能)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* 登録ボタン */}
            <button
              onClick={handleSubmit}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              希望を追加
            </button>
          </div>
        </div>

        {/* 情報ボックス */}
        <div className="p-4 bg-blue-50 rounded-b-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            シフト希望登録のポイント
          </h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 希望日は月初に一括登録することをお勧めします</li>
            <li>• 「要相談」を選択すると柔軟な時間調整が可能です</li>
            <li>• 高優先度の日程は優先的にマッチングされます</li>
            <li>• NG薬局の設定は別途管理画面で行えます</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;
