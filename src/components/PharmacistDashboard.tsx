import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Sun, MessageCircle, Smile } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, supabase } from '../lib/supabase';

interface PharmacistDashboardProps {
  user: any;
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [selectedPriority, setSelectedPriority] = useState('medium');
  
  // Railwayログ用のヘルパー関数
  const logToRailway = (message: string, data?: any) => {
    const logMessage = `[PharmacistDashboard] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
    console.log(logMessage);
    
    // Railwayのログに確実に出力されるようにfetchでログ送信を試行
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'log',
          message: logMessage, 
          timestamp: new Date().toISOString() 
        })
      }).catch(() => {
        // APIエンドポイントが存在しない場合は無視
      });
    } catch (error) {
      // エラーは無視
    }
  };

  // デバッグ用: 状態の変更を監視
  useEffect(() => {
    logToRailway('State changed', {
      selectedDate,
      selectedTimeSlot,
      selectedPriority
    });
  }, [selectedDate, selectedTimeSlot, selectedPriority]);

  // 個別の状態変更監視
  useEffect(() => {
    logToRailway('selectedTimeSlot changed', selectedTimeSlot);
  }, [selectedTimeSlot]);
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');


  useEffect(() => {
    loadShifts();
  }, [user]);



  const [userProfiles, setUserProfiles] = useState<any>({});

  const loadShifts = async () => {
    try {
      console.log('Loading pharmacist shifts...');
      
      // 直接Supabaseから確定シフトを取得
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('pharmacist_id', user.id)
        .eq('status', 'confirmed');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setMyShifts([]);
      } else {
        console.log('Loaded assigned shifts:', assignedData);
        setMyShifts(assignedData || []);
      }
      
      // シフト希望を取得
      const { data: reqs, error: reqsError } = await shiftRequests.getRequests(user.id, 'pharmacist');
      if (reqsError) {
        console.error('Error loading shift requests:', reqsError);
        setMyRequests([]);
      } else {
        logToRailway('Loaded shift requests', reqs);
        // データベースのtime_slot値を確認
        if (reqs && reqs.length > 0) {
          logToRailway('Database time_slot values', reqs.map((r: any) => ({ 
            date: r.date, 
            time_slot: r.time_slot, 
            priority: r.priority 
          })));
        }
        setMyRequests(reqs || []);
      }
      
      // ユーザープロフィールを取得
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profileData) {
        setProfileName(profileData.name || '');
      }
      
      // シフトに関連する薬局のプロフィールを取得
      if (assignedData && assignedData.length > 0) {
        const pharmacyIds = [...new Set(assignedData.map((shift: any) => shift.pharmacy_id))];
        const { data: pharmacyProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', pharmacyIds);
        
        if (pharmacyProfiles) {
          const profilesMap: any = {};
          pharmacyProfiles.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
          setUserProfiles(profilesMap);
        }
      }
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
      
      // 既存のシフト希望がある場合は自動選択
      const existingRequest = myRequests.find((r: any) => r.date === formattedDate);
      if (existingRequest) {
        logToRailway('Found existing request for date', existingRequest);
        setSelectedTimeSlot(existingRequest.time_slot);
        setSelectedPriority(existingRequest.priority);
        setMemo(existingRequest.memo || '');
      } else {
        // 新しい日付の場合は時間帯をリセット
        setSelectedTimeSlot('');
        setMemo('');
      }
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ name: profileName })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating profile:', error);
        alert('プロフィールの更新に失敗しました');
      } else {
        alert('プロフィールを更新しました');
        setShowProfileEdit(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  const handleSubmit = async () => {
    console.log('PharmacistDashboard: handleSubmit called');
    console.log('Form data:', { selectedDate, selectedTimeSlot, selectedPriority, memo, userId: user.id });
    
    if (!selectedDate || !selectedTimeSlot) {
      alert('日付と時間帯を選択してください');
      return;
    }

    // 既存のシフト希望があるかチェック
    const existingRequest = myRequests.find((r: any) => r.date === selectedDate);
    
    if (existingRequest) {
      // 既存の希望がある場合は削除
      if (confirm('この日付のシフト希望を削除しますか？')) {
        try {
          const { error } = await supabase
            .from('shift_requests')
            .delete()
            .eq('id', existingRequest.id);
          
          if (error) {
            console.error('Error deleting shift request:', error);
            alert(`シフト希望の削除に失敗しました: ${(error as any).message || (error as any).code || 'Unknown error'}`);
          } else {
            console.log('Shift request deleted successfully');
            alert('シフト希望を削除しました');
            setSelectedTimeSlot('');
            setMemo('');
            loadShifts();
          }
        } catch (error) {
          console.error('Error deleting shift request:', error);
          alert('シフト希望の削除に失敗しました');
        }
      }
    } else {
      // 新しい希望を登録
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
        const { error } = await shiftRequests.createRequests([shiftRequest]);
        
        if (error) {
          console.error('Error creating shift request:', error);
          alert(`シフト希望の登録に失敗しました: ${(error as any).message || (error as any).code || 'Unknown error'}`);
        } else {
          console.log('Shift request created successfully');
          alert('シフト希望を登録しました');
          // 登録後は時間帯とメモのみリセット、日付は保持
          setSelectedTimeSlot('');
          setMemo('');
          loadShifts();
        }
      } catch (error) {
        console.error('Error submitting shift request:', error);
        alert('シフト希望の登録に失敗しました');
      }
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
  const hasMyShift = (day: number) => myShifts.some((s: any) => s.date === `${y}-${m}-${day.toString().padStart(2, '0')}`);

  return (
    <div className="space-y-6">

      
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
                    {hasMyShift(day) && (
                      <div className="relative group">
                        <div className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block cursor-pointer">
                          割当
                        </div>
                        
                        {/* マウスオーバーで表示される詳細情報 */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                            <div className="font-medium mb-2">確定シフト詳細</div>
                            {myShifts.filter((shift: any) => 
                              shift.date === `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                            ).map((shift: any, index: number) => {
                              const pharmacyProfile = userProfiles[shift.pharmacy_id];
                              return (
                                <div key={index} className="mb-2 last:mb-0 border-b border-gray-600 pb-2 last:border-b-0">
                                  <div className="text-green-300 font-medium">
                                    時間: {shift.time_slot === 'morning' || shift.time_slot === 'am' ? '午前' : 
                                          shift.time_slot === 'afternoon' || shift.time_slot === 'pm' ? '午後' : 
                                          shift.time_slot === 'full' ? '終日' : 
                                          shift.time_slot === 'consult' ? '要相談' : '夜間'}
                                  </div>
                                  <div className="text-yellow-300">
                                    薬局: {pharmacyProfile?.name || pharmacyProfile?.email || shift.pharmacy_id}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 absolute top-full left-1/2 transform -translate-x-1/2"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 確定シフトがない場合のみ希望バッジを表示 */}
                    {!hasMyShift(day) && hasMyRequest(day) && (
                      <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">希望</div>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">シフト希望登録</h2>
              <button
                onClick={() => setShowProfileEdit(!showProfileEdit)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                プロフィール編集
              </button>
            </div>
            
            {/* プロフィール編集フォーム */}
            {showProfileEdit && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">名前の設定</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="あなたの名前"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={handleProfileUpdate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    更新
                  </button>
                </div>
              </div>
            )}
            
            {/* 選択された日付と時間 */}
            {selectedDate && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  希望時間: {selectedTimeSlot ? (
                    selectedTimeSlot === 'morning' || selectedTimeSlot === 'am' ? '午前 (9:00-13:00)' :
                    selectedTimeSlot === 'afternoon' || selectedTimeSlot === 'pm' ? '午後 (13:00-18:00)' :
                    selectedTimeSlot === 'full' ? '終日 (9:00-18:00)' :
                    selectedTimeSlot === 'consult' ? '要相談' : selectedTimeSlot
                  ) : '未選択'}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  優先度: {selectedPriority === 'high' ? '高優先度' :
                   selectedPriority === 'medium' ? '中優先度' :
                   selectedPriority === 'low' ? '低優先度' : selectedPriority}
                </div>
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
                    onClick={() => {
                      logToRailway('Time slot clicked', slot.id);
                      logToRailway('Before setSelectedTimeSlot', selectedTimeSlot);
                      setSelectedTimeSlot(slot.id);
                      logToRailway('After setSelectedTimeSlot call');
                    }}
                    className={`flex items-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${
                      selectedTimeSlot === slot.id ? slot.color : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    style={{ border: selectedTimeSlot === slot.id ? '2px solid blue' : 'none' }}
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
                    onClick={() => setSelectedPriority(priority.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-white text-sm font-medium transition-colors ${
                      selectedPriority === priority.id ? priority.color : 'bg-gray-300 hover:bg-gray-400'
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



            {/* 登録/削除ボタン */}
            {myShifts.find((s: any) => s.date === selectedDate) ? (
              <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium">
                確定済みのため編集できません
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  myRequests.find((r: any) => r.date === selectedDate)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {myRequests.find((r: any) => r.date === selectedDate) ? '希望を削除' : '希望を追加'}
              </button>
            )}

            {/* 情報ボックス */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
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
      </div>
    </div>
  );
};

export default PharmacistDashboard;
