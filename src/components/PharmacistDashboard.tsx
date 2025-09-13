import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Sun, MessageCircle, Smile } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, systemStatus, supabase } from '../lib/supabase';

interface PharmacistDashboardProps {
  user: any;
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [isSystemConfirmed, setIsSystemConfirmed] = useState(false);

  // 日付をリストに追加する関数
  const addDateToList = () => {
    if (tempSelectedDate && !selectedDates.includes(tempSelectedDate)) {
      setSelectedDates(prev => [...prev, tempSelectedDate]);
      setTempSelectedDate('');
    }
  };

  // 日付をリストから削除する関数
  const removeDateFromList = (dateToRemove: string) => {
    setSelectedDates(prev => prev.filter(date => date !== dateToRemove));
  };
  
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
      selectedDates,
      selectedTimeSlot,
      selectedPriority
    });
  }, [selectedDates, selectedTimeSlot, selectedPriority]);

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
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [ngList, setNgList] = useState<string[]>([]); // 薬局IDの配列
  const [selectedNgPharmacyId, setSelectedNgPharmacyId] = useState('');


  useEffect(() => {
    loadShifts();
  }, [user]);



  const [userProfiles, setUserProfiles] = useState<any>({});

  const loadShifts = async () => {
    try {
      console.log('Loading pharmacist shifts...');
      
      // システム状態を取得
      const { data: systemStatusData, error: systemStatusError } = await systemStatus.getSystemStatus();
      if (!systemStatusError && systemStatusData) {
        console.log('System status:', systemStatusData.status);
        setIsSystemConfirmed(systemStatusData.status === 'confirmed');
      } else {
        console.log('System status error:', systemStatusError);
      }
      
      // 直接Supabaseから確定シフトを取得
      console.log('Current user ID:', user.id);
      console.log('User object:', user);
      
      // 認証状態を確認
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('Auth user:', authUser);
      console.log('Auth error:', authError);
      
      // アラートで認証状態を表示
      if (authUser) {
        alert(`認証ユーザーID: ${authUser.id}\n現在のユーザーID: ${user.id}\n一致: ${authUser.id === user.id ? 'はい' : 'いいえ'}`);
      } else {
        alert('認証ユーザーが取得できません');
      }
      
      // まず全てのassigned_shiftsを取得してデバッグ
      const { data: allAssignedData, error: allAssignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      console.log('All assigned shifts:', allAssignedData);
      console.log('All assigned shifts error:', allAssignedError);
      
      // アラートでも表示（コンソールが見えない場合）
      if (allAssignedData && allAssignedData.length > 0) {
        alert(`assigned_shiftsテーブルに${allAssignedData.length}件のデータがあります\n現在のユーザーID: ${user.id}\nテーブル内のpharmacist_id: ${allAssignedData.map((s: any) => s.pharmacist_id).slice(0, 3).join(', ')}...`);
      } else {
        alert('assigned_shiftsテーブルにデータがありません');
      }
      
      // 認証ユーザーIDを使用してシフトを取得
      const userIdToUse = authUser?.id || user.id;
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('pharmacist_id', userIdToUse)
        .eq('status', 'confirmed');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setMyShifts([]);
      } else {
        console.log('Loaded assigned shifts:', assignedData);
        console.log('My shifts count:', assignedData?.length || 0);
        if (assignedData && assignedData.length > 0) {
          console.log('My shifts details:', assignedData.map((s: any) => ({ date: s.date, status: s.status, pharmacy_id: s.pharmacy_id })));
          alert(`あなたの確定シフト: ${assignedData.length}件\n日付: ${assignedData.map((s: any) => s.date).join(', ')}`);
        } else {
          alert('あなたの確定シフトは0件です');
        }
        setMyShifts(assignedData || []);
      }
      
      // シフト希望を取得
      const { data: reqs, error: reqsError } = await shiftRequests.getRequests(userIdToUse, 'pharmacist');
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
        .eq('id', userIdToUse)
        .single();
      
      if (!profileError && profileData) {
        setProfileName(profileData.name || '');
        setNgList(profileData.ng_list || []);
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

  // 全薬局のリストを取得（NG選択用）
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id,name,email')
          .eq('user_type', 'pharmacy');
        setAllPharmacies(data || []);
      } catch {}
    })();
  }, []);

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
      // 選択済み日付リストのトグル（追加/削除）
      if (selectedDates.includes(formattedDate)) {
        // 既に選択済みの場合は削除
        setSelectedDates(prev => prev.filter(date => date !== formattedDate));
      } else {
        // 未選択の場合は追加
        setSelectedDates(prev => [...prev, formattedDate]);
      }
      
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
      console.log('=== PHARMACIST PROFILE UPDATE START ===');
      console.log('User ID:', user.id);
      console.log('Profile name:', profileName);
      console.log('NG list to save:', ngList);
      console.log('NG list type:', typeof ngList);
      console.log('NG list length:', ngList.length);
      
      // 認証ユーザーIDを取得
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;
      
      // ユーザーIDの確認
      if (!userIdToUse) {
        console.error('User ID is missing!');
        alert('ユーザーIDが取得できません。ログインし直してください。');
        return;
      }
      
      const updatePayload = {
        name: profileName || user.email || 'Unknown',
        ng_list: ngList
      };
      
      console.log('Update payload:', updatePayload);
      
      const { data: updateResult, error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', userIdToUse)
        .select('*');
      
      console.log('Update result:', { data: updateResult, error });
      
      if (error) {
        console.error('Error updating profile:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // RLSエラーの場合の特別な処理
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          console.error('RLS permission error detected');
          alert('権限エラー: プロフィールの更新が拒否されました。RLSポリシーを確認してください。');
        } else {
          alert(`プロフィールの更新に失敗しました: ${error.message}`);
        }
      } else {
        console.log('Profile updated successfully');
        console.log('Updated data returned:', updateResult);
        
        // 更新されたデータを確認
        if (updateResult && updateResult.length > 0) {
          console.log('Updated ng_list:', updateResult[0].ng_list);
        }
        
        alert('プロフィールを更新しました');
        setShowProfileEdit(false);
        // 成功時はローカルキャッシュも更新
        try {
          localStorage.setItem(`ng_list_${user?.id || ''}`, JSON.stringify(ngList));
        } catch {}
      }
      
      console.log('=== PHARMACIST PROFILE UPDATE END ===');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  const addNgPharmacy = async () => {
    if (selectedNgPharmacyId && !ngList.includes(selectedNgPharmacyId)) {
      const newNgList = [...ngList, selectedNgPharmacyId];
      setNgList(newNgList);
      setSelectedNgPharmacyId('');
      console.log('NG pharmacy added to local state:', selectedNgPharmacyId);
      
      // 即座にデータベースに保存
      await updateNgListInDatabase(newNgList);
    }
  };
  const removeNgPharmacy = async (id: string) => {
    const newNgList = ngList.filter(x => x !== id);
    setNgList(newNgList);
    console.log('NG pharmacy removed from local state:', id);
    
    // 即座にデータベースに保存
    await updateNgListInDatabase(newNgList);
  };

  const updateNgListInDatabase = async (newNgList: string[]) => {
    try {
      console.log('=== UPDATING NG LIST IN DATABASE ===');
      console.log('User ID:', user.id);
      console.log('New NG list:', newNgList);
      
      // ユーザーIDの確認
      if (!user?.id) {
        console.error('User ID is missing!');
        return;
      }
      
      const updatePayload = {
        ng_list: newNgList
      };
      
      console.log('Update payload:', updatePayload);
      
      const { data: updateResult, error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', userIdToUse)
        .select('*');
      
      console.log('Update result:', { data: updateResult, error });
      
      if (error) {
        console.error('Error updating NG list:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // RLSエラーの場合の特別な処理
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          console.error('RLS permission error detected');
          alert('権限エラー: NG薬局の更新が拒否されました。');
        } else {
          alert(`NG薬局の更新に失敗しました: ${error.message}`);
        }
      } else {
        console.log('NG list updated successfully');
        console.log('Updated data returned:', updateResult);
        
        // 更新されたデータを確認
        if (updateResult && updateResult.length > 0) {
          console.log('Updated ng_list:', updateResult[0].ng_list);
        }
        
        // 成功時はローカルキャッシュも更新
        try {
          localStorage.setItem(`ng_list_${user?.id || ''}`, JSON.stringify(newNgList));
        } catch {}
      }
      
      console.log('=== UPDATING NG LIST IN DATABASE END ===');
    } catch (error) {
      console.error('Error updating NG list:', error);
      alert('NG薬局の更新に失敗しました');
    }
  };

  const handleSubmit = async () => {
    console.log('PharmacistDashboard: handleSubmit called');
    console.log('Form data:', { selectedDates, selectedTimeSlot, selectedPriority, memo, userId: user.id });
    
    if (selectedDates.length === 0 || !selectedTimeSlot) {
      alert('日付と時間帯を選択してください');
      return;
    }

    // 新しい希望を登録
    try {
      // 認証ユーザーIDを取得
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;
      
      const requestsToInsert = selectedDates.map(date => ({
        pharmacist_id: userIdToUse,
        date: date,
        time_slot: selectedTimeSlot,
        priority: selectedPriority,
        memo: memo,
        status: 'pending'
      }));

      console.log('Creating shift requests:', requestsToInsert);
      const { error } = await shiftRequests.createRequests(requestsToInsert);
      
      if (error) {
        console.error('Error creating shift requests:', error);
        alert(`シフト希望の登録に失敗しました: ${(error as any).message || (error as any).code || 'Unknown error'}`);
      } else {
        console.log('Shift requests created successfully');
        alert(`${selectedDates.length}件のシフト希望を登録しました`);
        setSelectedDates([]);
        setSelectedTimeSlot('');
        setMemo('');
        loadShifts();
      }
    } catch (error) {
      console.error('Error submitting shift requests:', error);
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
  const hasMyShift = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const hasShift = myShifts.some((s: any) => s.date === dateStr);
    if (hasShift) {
      console.log(`Day ${day} has confirmed shift:`, myShifts.filter((s: any) => s.date === dateStr));
    }
    return hasShift;
  };

  return (
    <div className="space-y-6">

      
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6">
        {/* 左側: カレンダー */}
                  <div className="flex-1 bg-white rounded-lg shadow p-4 lg:p-6">
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
                  selectedDates.includes(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day?.toString().padStart(2, '0')}`)
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
                          確定
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
                    {/* 確定シフトがない場合のみ希望バッジを表示（要相談は「相談」パッチ） */}
                    {!hasMyShift(day) && hasMyRequest(day) && (() => {
                      const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                      const dayReqs = myRequests.filter((r: any) => r.date === dateStr);
                      const hasConsult = dayReqs.some((r: any) => r.time_slot === 'consult' || r.time_slot === 'negotiable');
                      return hasConsult ? (
                        <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 mt-1 inline-block">相談</div>
                      ) : (
                        <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">希望</div>
                      );
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右側: シフト希望登録フォーム */}
        <div className="w-full lg:w-96 bg-white rounded-lg shadow">
                      <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {isSystemConfirmed ? '確定シフト詳細' : 'シフト希望登録'}
              </h2>
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

                {/* NG薬局の設定 */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">NG薬局の設定</h3>
                  <div className="flex space-x-2 mb-2">
                    <select
                      value={selectedNgPharmacyId}
                      onChange={(e) => setSelectedNgPharmacyId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">薬局を選択</option>
                      {allPharmacies.map((p) => (
                        <option key={p.id} value={p.id}>{p.name || p.email}</option>
                      ))}
                    </select>
                    <button
                      onClick={addNgPharmacy}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      追加
                    </button>
                  </div>
                  {ngList.length > 0 && (
                    <div className="space-y-1">
                      {ngList.map((id) => (
                        <div key={id} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm">{allPharmacies.find(p => p.id === id)?.name || id}</span>
                          <button onClick={() => removeNgPharmacy(id)} className="text-red-600 hover:text-red-800 text-sm">削除</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 確定シフトの詳細表示 */}
            {isSystemConfirmed && myShifts.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-3">確定シフト一覧</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myShifts.map((shift: any, index: number) => {
                    const pharmacyProfile = userProfiles[shift.pharmacy_id];
                    return (
                      <div key={index} className="bg-white p-3 rounded border border-green-200">
                        <div className="text-sm font-medium text-gray-800">
                          {new Date(shift.date).getMonth() + 1}月{new Date(shift.date).getDate()}日
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          時間: {shift.time_slot === 'morning' || shift.time_slot === 'am' ? '午前 (9:00-13:00)' :
                                shift.time_slot === 'afternoon' || shift.time_slot === 'pm' ? '午後 (13:00-18:00)' :
                                shift.time_slot === 'full' ? '終日 (9:00-18:00)' :
                                shift.time_slot === 'consult' ? '要相談' : '夜間'}
                        </div>
                        <div className="text-xs text-gray-600">
                          薬局: {pharmacyProfile?.name || pharmacyProfile?.email || '薬局名未設定'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 選択された日付と時間 */}
            {selectedDates.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  選択された日付 ({selectedDates.length}件)
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map(date => (
                    <span key={date} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {new Date(date).getMonth() + 1}月{new Date(date).getDate()}日
                    </span>
                  ))}
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
                value={tempSelectedDate}
                onChange={(e) => setTempSelectedDate(e.target.value)}
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
              
              {/* リストに追加ボタン */}
              <button
                type="button"
                onClick={addDateToList}
                className="mt-2 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
              >
                リストに追加
              </button>
              
              {/* 選択済み日付の表示 */}
              {selectedDates.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-2">選択済み日付:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        {new Date(date).getMonth() + 1}月{new Date(date).getDate()}日
                        <button
                          type="button"
                          onClick={() => removeDateFromList(date)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
            {isSystemConfirmed ? (
              <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium">
                シフト確定済みのため編集できません
              </div>
            ) : selectedDates.length > 0 && myShifts.some((s: any) => selectedDates.includes(s.date)) ? (
              <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium">
                確定済みのため編集できません
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                希望を追加
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
