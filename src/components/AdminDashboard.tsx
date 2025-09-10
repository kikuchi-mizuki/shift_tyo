import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, supabase } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [assigned, setAssigned] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [postings, setPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pharmacies: false,
    pharmacists: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 薬局と薬剤師のデータを整理する関数
  const getOrganizedUserData = () => {
    const pharmacies: any[] = [];
    const pharmacists: any[] = [];

    Object.values(userProfiles).forEach((profile: any) => {
      if (profile.user_type === 'pharmacy') {
        pharmacies.push(profile);
      } else if (profile.user_type === 'pharmacist') {
        pharmacists.push(profile);
      }
    });

    return { pharmacies, pharmacists };
  };


  useEffect(() => {
    console.log('=== ADMIN DASHBOARD MOUNTED ===');
    console.log('User:', user);
    loadAll();
  }, [user, currentDate]);

  const loadAll = async () => {
    try {
      // Railwayログに出力
      const logToRailway = (message: string, data?: any) => {
        console.log(`[RAILWAY_LOG] ${message}`, data ? JSON.stringify(data) : '');
        // サーバーサイドのログとして出力
        if (typeof window !== 'undefined') {
          // ブラウザ環境ではfetchでログを送信
          fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
          }).catch(() => {}); // エラーは無視
        }
      };

      logToRailway('=== LOADALL START ===');
      logToRailway('Loading all data...');
      
      // 直接Supabaseからassigned_shiftsを取得
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      
      if (assignedError) {
        logToRailway('Error loading assigned shifts:', assignedError);
        setAssigned([]);
      } else {
        logToRailway('Loaded assigned shifts:', assignedData);
        setAssigned(assignedData || []);
      }
      
      const { data: r } = await shiftRequests.getRequests('', 'admin' as any);
      setRequests(r || []);
      const { data: p } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(p || []);
      
      // ユーザープロフィールを取得（管理者用）
      logToRailway('Fetching user profiles...');
      
      // まず、シフトに含まれるユーザーIDを収集
      const userIds = new Set<string>();
      if (assignedData) {
        assignedData.forEach((shift: any) => {
          userIds.add(shift.pharmacist_id);
          userIds.add(shift.pharmacy_id);
        });
      }
      
      logToRailway('User IDs from shifts:', Array.from(userIds));
      
                   // 直接Supabaseからプロフィールを取得（管理者用）
             logToRailway('Fetching user profiles directly...');
             
             // まず、全プロフィールを取得してみる
             const { data: allProfilesData, error: allProfilesError } = await supabase
               .from('user_profiles')
               .select('*');
             
             // user_profilesが存在しない場合はapp_usersを試す
             if (allProfilesError && allProfilesError.message.includes('does not exist')) {
               logToRailway('user_profiles table not found, trying app_users...');
               const { data: appUsersData, error: appUsersError } = await supabase
                 .from('app_users')
                 .select('*');
               
               if (appUsersError) {
                 logToRailway('Error loading app_users:', appUsersError);
                 // 他のテーブル名も試す
                 logToRailway('Trying other possible table names...');
                 
                 // v_user_profilesを試す
                 const { data: vUserProfilesData, error: vUserProfilesError } = await supabase
                   .from('v_user_profiles')
                   .select('*');
                 
                 if (vUserProfilesError) {
                   logToRailway('Error loading v_user_profiles:', vUserProfilesError);
                   setUserProfiles({});
                 } else {
                   logToRailway('Loaded v_user_profiles:', vUserProfilesData);
                   const profilesMap: any = {};
                   vUserProfilesData?.forEach((user: any) => {
                     // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
                     let userType = user.user_type;
                     if (!userType) {
                       // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
                       const email = user.email?.toLowerCase() || '';
                       const name = user.name?.toLowerCase() || '';
                       userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                                 name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
                     }
                     
                     // デバッグログ
                     console.log(`User ${user.email} (${user.name}) classified as: ${userType}`);
                     
                     profilesMap[user.id] = {
                       id: user.id,
                       name: user.name,
                       email: user.email,
                       user_type: userType
                     };
                   });
                   setUserProfiles(profilesMap);
                   return;
                 }
               } else {
                 logToRailway('Loaded app_users:', appUsersData);
                 // app_usersのデータをuser_profiles形式に変換
                 const profilesMap: any = {};
                 appUsersData?.forEach((user: any) => {
                   // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
                   let userType = user.user_type;
                   if (!userType) {
                     // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
                     const email = user.email?.toLowerCase() || '';
                     const name = user.name?.toLowerCase() || '';
                     userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                               name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
                   }
                   
                   // デバッグログ
                   console.log(`User ${user.email} (${user.name}) classified as: ${userType}`);
                   
                   profilesMap[user.id] = {
                     id: user.id,
                     name: user.name,
                     email: user.email,
                     user_type: userType
                   };
                 });
                 setUserProfiles(profilesMap);
                 return;
               }
             }
      
      if (allProfilesError) {
        logToRailway('Error loading all user profiles:', allProfilesError);
        console.error('プロフィール取得エラー:', allProfilesError.message);
      } else {
        logToRailway('Loaded all user profiles:', allProfilesData);
        
        if (allProfilesData && allProfilesData.length > 0) {
          const profilesMap: any = {};
          allProfilesData.forEach((profile: any) => {
            // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
            let userType = profile.user_type;
            if (!userType) {
              // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
              const email = profile.email?.toLowerCase() || '';
              const name = profile.name?.toLowerCase() || '';
              userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                        name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
            }
            
            // デバッグログ
            console.log(`User ${profile.email} (${profile.name}) classified as: ${userType}`);
            
            profilesMap[profile.id] = {
              ...profile,
              user_type: userType
            };
          });
          logToRailway('User profiles map:', profilesMap);
          setUserProfiles(profilesMap);
          
          // シフトに含まれるユーザーIDをチェック
          const shiftUserIds = Array.from(userIds);
          logToRailway('Shift user IDs:', shiftUserIds);
          
          const foundProfiles = shiftUserIds.filter(id => profilesMap[id]);
          logToRailway('Found profiles for shift users:', foundProfiles);
          
          // 詳細なマッチング情報をログ出力
          shiftUserIds.forEach(id => {
            const profile = profilesMap[id];
            logToRailway(`Profile lookup for ID ${id}:`, profile ? 'FOUND' : 'NOT FOUND');
            if (profile) {
              logToRailway(`Profile details for ${id}:`, { name: profile.name, email: profile.email, user_type: profile.user_type });
            }
          });
          
          // 全プロフィールのID一覧をログ出力
          const allProfileIds = Object.keys(profilesMap);
          logToRailway('All profile IDs:', allProfileIds);
          
          // プロフィールマッチング状況をログ出力（アラートは削除）
          if (foundProfiles.length > 0) {
            const foundProfileDetails = foundProfiles.map(id => {
              const profile = profilesMap[id];
              return `${profile.name || profile.email} (${profile.user_type})`;
            });
            logToRailway('Profile matching success:', foundProfileDetails);
          } else {
            logToRailway('No profiles found for shift users');
          }
        } else {
          logToRailway('No profiles data available');
          console.warn('プロフィールが取得できませんでした');
        }
      }
    } catch (e) {
      console.error('Error in loadAll:', e);
    } finally {
      setLoading(false);
      console.log('=== LOADALL END ===');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [] as (number|null)[];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };



  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateSelect = (day: number) => {
    if (day) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      setSelectedDate(formattedDate);
    }
  };

  const handleConfirmShifts = async () => {
    try {
      console.log('handleConfirmShifts called');
      console.log('Current requests:', requests);
      console.log('Current postings:', postings);
      
      // 希望シフトと募集シフトをマッチングして確定済みシフトを作成
      const confirmedShifts: any[] = [];
      
      // 各日付で希望と募集をマッチング
      const dateGroups = new Map();
      
      // 希望シフトを日付ごとにグループ化
      requests.forEach((request: any) => {
        if (!dateGroups.has(request.date)) {
          dateGroups.set(request.date, { requests: [], postings: [] });
        }
        dateGroups.get(request.date).requests.push(request);
      });
      
      // 募集シフトを日付ごとにグループ化
      postings.forEach((posting: any) => {
        if (!dateGroups.has(posting.date)) {
          dateGroups.set(posting.date, { requests: [], postings: [] });
        }
        dateGroups.get(posting.date).postings.push(posting);
      });
      
      console.log('Date groups:', dateGroups);
      
      // マッチング処理
      dateGroups.forEach((group, date) => {
        console.log(`Processing date ${date}:`, group);
        group.requests.forEach((request: any) => {
          // 同じ日付・時間帯の募集があればマッチング
          const matchingPosting = group.postings.find((posting: any) => 
            posting.time_slot === request.time_slot
          );
          
          if (matchingPosting) {
            const confirmedShift = {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: matchingPosting.pharmacy_id,
              date: date,
              time_slot: request.time_slot,
              status: 'confirmed',
              created_at: new Date().toISOString()
            };
            console.log('Creating confirmed shift:', confirmedShift);
            confirmedShifts.push(confirmedShift);
          }
        });
      });

      console.log('Final confirmed shifts:', confirmedShifts);

      if (confirmedShifts.length === 0) {
        alert('マッチングできるシフトがありません。希望シフトと募集シフトの日付・時間帯が一致するものを確認してください。');
        return;
      }

      // ユーザーIDの妥当性チェック
      const invalidShifts = confirmedShifts.filter(shift => 
        !shift.pharmacist_id || !shift.pharmacy_id || 
        shift.pharmacist_id === 'test-pharmacist-id' || 
        shift.pharmacy_id === 'test-pharmacy-id'
      );
      
      if (invalidShifts.length > 0) {
        console.error('Invalid shifts found:', invalidShifts);
        alert('無効なユーザーIDが含まれています。シフトの確定に失敗しました。');
        return;
      }

      // upsertを使用して重複を自動的に処理
      console.log('Proceeding with upsert (automatic duplicate handling)...');
      console.log('Shifts to upsert:', confirmedShifts);
      
      // Supabaseに確定済みシフトを保存（upsert使用）
      console.log('Calling createConfirmedShifts with upsert:', confirmedShifts);
      const { error } = await shifts.createConfirmedShifts(confirmedShifts);
      
      if (error) {
        console.error('Error confirming shifts:', error);
        alert(`シフトの確定に失敗しました: ${(error as any).message || (error as any).code || 'Unknown error'}`);
        return;
      }

      setSystemStatus('confirmed');
      setLastUpdated(new Date());
      alert(`${confirmedShifts.length}件のシフトを確定しました（重複は自動的に処理されました）`);
      
      // データを再読み込み
      loadAll();
    } catch (error) {
      console.error('Error in handleConfirmShifts:', error);
      alert(`シフトの確定に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 確定シフトの取り消し
  const handleCancelConfirmedShifts = async (date: string) => {
    if (!confirm(`${date}の確定シフトを取り消しますか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assigned_shifts')
        .delete()
        .eq('date', date)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error canceling confirmed shifts:', error);
        alert(`確定シフトの取り消しに失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      alert(`${date}の確定シフトを取り消しました`);
      loadAll();
    } catch (error) {
      console.error('Error in handleCancelConfirmedShifts:', error);
      alert(`確定シフトの取り消しに失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // シフト編集の状態管理
  const [editingShift, setEditingShift] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    pharmacist_id: '',
    pharmacy_id: '',
    time_slot: ''
  });

  // シフトの編集開始
  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setEditForm({
      pharmacist_id: shift.pharmacist_id,
      pharmacy_id: shift.pharmacy_id,
      time_slot: shift.time_slot
    });
  };

  // シフト編集の保存
  const handleSaveShiftEdit = async () => {
    if (!editingShift) return;

    try {
      const { error } = await supabase
        .from('assigned_shifts')
        .update(editForm)
        .eq('id', editingShift.id);

      if (error) {
        console.error('Error updating shift:', error);
        alert(`シフトの更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      alert('シフトを更新しました');
      setEditingShift(null);
      setEditForm({ pharmacist_id: '', pharmacy_id: '', time_slot: '' });
      loadAll();
    } catch (error) {
      console.error('Error in handleSaveShiftEdit:', error);
      alert(`シフトの更新に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // シフト編集のキャンセル
  const handleCancelShiftEdit = () => {
    setEditingShift(null);
    setEditForm({ pharmacist_id: '', pharmacy_id: '', time_slot: '' });
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

      
      <div className={`border rounded-lg p-4 ${systemStatus === 'confirmed' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className={`w-5 h-5 ${systemStatus === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <h3 className={`text-sm font-medium ${systemStatus === 'confirmed' ? 'text-green-800' : 'text-yellow-800'}`}>
              システム状態: {systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフト未確定'}
            </h3>
            <p className={`text-sm mt-1 ${systemStatus === 'confirmed' ? 'text-green-700' : 'text-yellow-700'}`}>
              {systemStatus === 'confirmed' 
                ? 'シフトが確定しました。変更が必要な場合は管理者にお問い合わせください。'
                : 'シフトが未確定です。管理者が確定ボタンを押すと確定されます。'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* left calendar */}
        <div className="flex-1 bg-white rounded-lg shadow p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
            </div>
          </div>

          <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((d, i) => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d?.toString().padStart(2, '0')}`;
              
              // その日の確定シフトを取得
              const dayAssignedShifts = assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed');
              
              // その日の希望と募集を取得
              const dayRequests = requests.filter((r: any) => r.date === dateStr);
              const dayPostings = postings.filter((p: any) => p.date === dateStr);
              
              // マッチング状況を計算
              const calculateMatchingStatus = () => {
                if (dayAssignedShifts.length > 0) {
                  return { type: 'confirmed', count: dayAssignedShifts.length };
                }
                
                if (dayRequests.length === 0 && dayPostings.length === 0) {
                  return { type: 'empty', count: 0 };
                }
                
                // 時間帯ごとにマッチング状況を分析
                const timeSlots = ['morning', 'afternoon', 'full', 'consult'];
                let totalMatched = 0;
                let totalRequired = 0;
                let totalAvailable = 0;
                
                timeSlots.forEach(timeSlot => {
                  const slotRequests = dayRequests.filter((r: any) => r.time_slot === timeSlot);
                  const slotPostings = dayPostings.filter((p: any) => p.time_slot === timeSlot);
                  
                  if (slotRequests.length > 0 || slotPostings.length > 0) {
                    const slotRequired = slotPostings.reduce((sum: number, p: any) => sum + p.required_staff, 0);
                    const slotAvailable = slotRequests.length;
                    const slotMatched = Math.min(slotRequired, slotAvailable);
                    
                    totalRequired += slotRequired;
                    totalAvailable += slotAvailable;
                    totalMatched += slotMatched;
                  }
                });
                
                if (totalRequired === 0) {
                  return { type: 'requests_only', count: totalAvailable };
                }
                
                if (totalMatched === totalRequired) {
                  return { type: 'matched', count: totalMatched };
                } else if (totalAvailable < totalRequired) {
                  return { type: 'shortage', count: totalMatched, shortage: totalRequired - totalAvailable };
                } else {
                  return { type: 'excess', count: totalMatched, excess: totalAvailable - totalRequired };
                }
              };
              
              const matchingStatus = calculateMatchingStatus();
              
              return (
                <div 
                  key={i} 
                  className={`p-1 sm:p-2 text-center text-xs sm:text-sm border border-gray-200 min-h-[60px] sm:min-h-[90px] ${
                    d ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                  } ${
                    selectedDate === dateStr ? 'bg-blue-100 border-blue-300' : ''
                  }`}
                  onClick={() => d && handleDateSelect(d)}
                >
                  {d && (
                    <>
                      <div className="font-medium">{d}</div>
                      
                      {/* マッチング状況表示 */}
                      {matchingStatus.type === 'confirmed' && (
                        <div className="relative group">
                          <div className="text-[8px] sm:text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            確定 {matchingStatus.count}件
                          </div>
                          
                          {/* マウスオーバーで表示される詳細情報 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                              <div className="font-medium mb-2">確定シフト詳細</div>
                               {dayAssignedShifts.map((shift: any, index: number) => {
                                 const pharmacistProfile = userProfiles[shift.pharmacist_id];
                                 const pharmacyProfile = userProfiles[shift.pharmacy_id];
                                 
                                 // Railwayログに出力
                                 const logToRailway = (message: string, data?: any) => {
                                   console.log(`[RAILWAY_LOG] ${message}`, data ? JSON.stringify(data) : '');
                                   if (typeof window !== 'undefined') {
                                     fetch('/api/log', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
                                     }).catch(() => {});
                                   }
                                 };
                                 
                                 logToRailway('Hover - Shift:', shift);
                                 logToRailway('Hover - Pharmacist profile:', pharmacistProfile);
                                 logToRailway('Hover - Pharmacy profile:', pharmacyProfile);
                                 logToRailway('Hover - User profiles count:', Object.keys(userProfiles).length);
                                 
                                 return (
                                   <div key={index} className="mb-2 last:mb-0 border-b border-gray-600 pb-2 last:border-b-0">
                                     <div className="text-green-300 font-medium">
                                       時間: {shift.time_slot === 'morning' ? '午前' : shift.time_slot === 'afternoon' ? '午後' : '夜間'}
                                     </div>
                                     <div className="text-blue-300">
                                       薬剤師: {pharmacistProfile?.name || pharmacistProfile?.email || shift.pharmacist_id}
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
                      
                      {/* マッチング状況表示（確定シフトがない場合） */}
                      {matchingStatus.type === 'matched' && (
                        <div className="relative group">
                          <div className="text-[8px] sm:text-[10px] text-green-600 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            マッチ {matchingStatus.count}件
                          </div>
                          
                          {/* マウスオーバーで表示される詳細情報 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                              <div className="font-medium mb-2">マッチング状況</div>
                              <div>マッチング: {matchingStatus.count}件</div>
                              <div>希望: {dayRequests.length}件</div>
                              <div>募集: {dayPostings.length}件</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {matchingStatus.type === 'shortage' && (
                        <div className="relative group">
                          <div className="text-[8px] sm:text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            不足 {matchingStatus.shortage}人
                          </div>
                          
                          {/* マウスオーバーで表示される詳細情報 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                              <div className="font-medium mb-2">人員不足</div>
                              <div>マッチング: {matchingStatus.count}件</div>
                              <div>不足: {matchingStatus.shortage}人</div>
                              <div>希望: {dayRequests.length}件</div>
                              <div>募集: {dayPostings.length}件</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {matchingStatus.type === 'excess' && (
                        <div className="relative group">
                          <div className="text-[8px] sm:text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            余裕 {matchingStatus.excess}人
                          </div>
                          
                          {/* マウスオーバーで表示される詳細情報 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                              <div className="font-medium mb-2">人員余裕</div>
                              <div>マッチング: {matchingStatus.count}件</div>
                              <div>余裕: {matchingStatus.excess}人</div>
                              <div>希望: {dayRequests.length}件</div>
                              <div>募集: {dayPostings.length}件</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {matchingStatus.type === 'requests_only' && (
                        <div className="relative group">
                          <div className="text-[8px] sm:text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            希望 {matchingStatus.count}件
                          </div>
                          
                          {/* マウスオーバーで表示される詳細情報 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                              <div className="font-medium mb-2">希望のみ</div>
                              <div>希望: {matchingStatus.count}件</div>
                              <div>募集: 0件</div>
                            </div>
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

        {/* right panel */}
        <div className="w-full lg:w-96 bg-white rounded-lg shadow border border-purple-200 flex flex-col h-[800px]">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex-shrink-0">
            <h2 className="text-xl font-semibold">管理者パネル</h2>
            <p className="text-sm text-purple-100 mt-1">システム全体の状態管理と調整</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            <button 
              onClick={handleConfirmShifts}
              className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium text-white text-sm ${
                systemStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフトを確定する'}</span>
            </button>
            

            
            {/* 選択された日付の詳細表示 */}
            {selectedDate && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">日付詳細</h3>
                    </div>
                    <button
                      onClick={() => setSelectedDate('')}
                      className="text-blue-100 hover:text-white text-sm"
                    >
                      ✕ 閉じる
                    </button>
                  </div>
                  <p className="text-sm text-blue-100 mt-1">
                    {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日の詳細情報
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  
                  {/* 確定シフト */}
                  {assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').length > 0 && (
                    <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-green-800">
                            確定シフト ({assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').length}件)
                          </h4>
                        </div>
                        <button
                          onClick={() => handleCancelConfirmedShifts(selectedDate)}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                        >
                          確定取り消し
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').map((shift: any, index: number) => {
                        const pharmacistProfile = userProfiles[shift.pharmacist_id];
                        const pharmacyProfile = userProfiles[shift.pharmacy_id];
                        const isEditing = editingShift?.id === shift.id;
                        
                        // 店舗名を取得（store_name または memo から）
                        const getStoreName = (shift: any) => {
                          const direct = (shift.store_name || '').trim();
                          let fromMemo = '';
                          if (!direct && typeof shift.memo === 'string') {
                            const m = shift.memo.match(/\[store:([^\]]+)\]/);
                            if (m && m[1]) fromMemo = m[1];
                          }
                          return direct || fromMemo || '（店舗名未設定）';
                        };
                        
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            {isEditing ? (
                              // 編集モード
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-green-700">編集モード</div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={handleSaveShiftEdit}
                                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelShiftEdit}
                                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 薬剤師選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">薬剤師:</label>
                                  <select
                                    value={editForm.pharmacist_id}
                                    onChange={(e) => setEditForm({...editForm, pharmacist_id: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    {(() => {
                                      const pharmacists = Object.entries(userProfiles)
                                        .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacist');
                                      return pharmacists.map(([id, profile]: [string, any]) => (
                                        <option key={id} value={id}>
                                          {profile.name || profile.email || '名前未設定'}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                                
                                {/* 薬局選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">薬局:</label>
                                  <select
                                    value={editForm.pharmacy_id}
                                    onChange={(e) => setEditForm({...editForm, pharmacy_id: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    {(() => {
                                      const pharmacies = Object.entries(userProfiles)
                                        .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacy' || profile.user_type === 'store');
                                      return pharmacies.map(([id, profile]: [string, any]) => (
                                        <option key={id} value={id}>
                                          {profile.name || profile.email || '名前未設定'}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                                
                                {/* 時間帯選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">時間帯:</label>
                                  <select
                                    value={editForm.time_slot}
                                    onChange={(e) => setEditForm({...editForm, time_slot: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="morning">午前 (9:00-13:00)</option>
                                    <option value="afternoon">午後 (13:00-18:00)</option>
                                    <option value="full">終日 (9:00-18:00)</option>
                                    <option value="consult">要相談</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              // 表示モード - 1行でシンプルに
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-800">
                                  {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'} → {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(shift)})
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-sm text-gray-500">
                                    {shift.time_slot === 'morning' ? '午前' : shift.time_slot === 'afternoon' ? '午後' : shift.time_slot === 'full' ? '終日' : '要相談'}
                                  </div>
                                  <button
                                    onClick={() => handleEditShift(shift)}
                                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                  >
                                    編集
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* シフト募集 */}
                  {postings.filter((p: any) => p.date === selectedDate).length > 0 && (
                    <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-orange-800">
                          募集している薬局 ({postings.filter((p: any) => p.date === selectedDate).length}件)
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {postings.filter((p: any) => p.date === selectedDate).map((posting: any, index: number) => {
                        const pharmacyProfile = userProfiles[posting.pharmacy_id];
                        
                        // 店舗名を取得（store_name または memo から）
                        const getStoreName = (posting: any) => {
                          const direct = (posting.store_name || '').trim();
                          let fromMemo = '';
                          if (!direct && typeof posting.memo === 'string') {
                            const m = posting.memo.match(/\[store:([^\]]+)\]/);
                            if (m && m[1]) fromMemo = m[1];
                          }
                          return direct || fromMemo || '（店舗名未設定）';
                        };
                        
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-800">
                                {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(posting)})
                              </div>
                              <div className="text-sm text-gray-500">
                                {posting.time_slot === 'morning' ? '午前' : posting.time_slot === 'afternoon' ? '午後' : '終日'} / {posting.required_staff}人
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* シフト希望 */}
                  {requests.filter((r: any) => r.date === selectedDate).length > 0 && (
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-blue-800">
                          応募している薬剤師 ({requests.filter((r: any) => r.date === selectedDate).length}件)
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {requests.filter((r: any) => r.date === selectedDate).map((request: any, index: number) => {
                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-800">
                                {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-sm text-gray-500">
                                  {request.time_slot === 'morning' ? '午前' : request.time_slot === 'afternoon' ? '午後' : '終日'}
                                </div>
                                <div className={`text-sm font-medium ${priorityColor}`}>
                                  {request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* マッチング可能な組み合わせ */}
                  {(() => {
                    // Railwayログ用の関数を定義
                    const logToRailway = (message: string, data?: any) => {
                      console.log(`[RAILWAY_LOG] ${message}`, data ? JSON.stringify(data) : '');
                      if (typeof window !== 'undefined') {
                        fetch('/api/log', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
                        }).catch(() => {});
                      }
                    };
                    
                    logToRailway('マッチング分析開始');
                    
                    const dayRequests = requests.filter((r: any) => r.date === selectedDate);
                    const dayPostings = postings.filter((p: any) => p.date === selectedDate);
                    
                    // デバッグ用ログ
                    console.log('=== マッチング分析デバッグ ===');
                    console.log('選択された日付:', selectedDate);
                    console.log('その日の希望:', dayRequests);
                    console.log('その日の募集:', dayPostings);
                    
                    // Railwayログにも送信
                    logToRailway('=== マッチング分析デバッグ ===');
                    logToRailway('選択された日付:', selectedDate);
                    logToRailway('その日の希望:', dayRequests);
                    logToRailway('その日の募集:', dayPostings);
                    
                    // 時間帯ごとにマッチング状況を分析
                    const timeSlots = ['morning', 'afternoon', 'full', 'consult'];
                    const matchingAnalysis = timeSlots.map(timeSlot => {
                      const slotRequests = dayRequests.filter((r: any) => r.time_slot === timeSlot);
                      const slotPostings = dayPostings.filter((p: any) => p.time_slot === timeSlot);
                      
                      if (slotRequests.length === 0 && slotPostings.length === 0) return null;
                      
                      // 薬剤師を優先順位でソート（高→中→低）
                      const sortedRequests = slotRequests.sort((a: any, b: any) => {
                        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      });
                      
                      const totalRequired = slotPostings.reduce((sum: number, p: any) => sum + p.required_staff, 0);
                      const totalAvailable = sortedRequests.length;
                      
                      // マッチングシミュレーション（優先順位順）
                      const matchedPharmacists: any[] = [];
                      const matchedPharmacies: any[] = [];
                      let remainingRequired = totalRequired;
                      
                      // 各薬局の必要人数を管理
                      const pharmacyNeeds = slotPostings.map((p: any) => ({
                        ...p,
                        remaining: p.required_staff
                      }));
                      
                      // 優先順位順に薬剤師をマッチング
                      sortedRequests.forEach((request: any) => {
                        if (remainingRequired > 0) {
                          // まだ人員が必要な薬局を探す
                          const availablePharmacy = pharmacyNeeds.find((p: any) => p.remaining > 0);
                          if (availablePharmacy) {
                            matchedPharmacists.push(request);
                            matchedPharmacies.push(availablePharmacy);
                            availablePharmacy.remaining--;
                            remainingRequired--;
                          }
                        }
                      });
                      
                      return {
                        timeSlot,
                        requests: sortedRequests,
                        postings: slotPostings,
                        totalRequired,
                        totalAvailable,
                        matchedPharmacists,
                        matchedPharmacies,
                        remainingRequired,
                        isMatching: totalAvailable > 0 && totalRequired > 0,
                        isShortage: totalAvailable < totalRequired,
                        hasExcess: totalAvailable > totalRequired
                      };
                    }).filter(Boolean);
                    
                    // デバッグ用ログ
                    console.log('マッチング分析結果:', matchingAnalysis);
                    logToRailway('マッチング分析結果:', matchingAnalysis);
                    
                    if (matchingAnalysis.length > 0) {
                      return (
                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <h4 className="text-sm font-semibold text-purple-800">マッチング状況</h4>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                          {matchingAnalysis.map((analysis: any, index: number) => (
                            <div key={index} className="bg-white rounded border px-2 py-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-800">
                                  {analysis.timeSlot === 'morning' ? '午前' : 
                                   analysis.timeSlot === 'afternoon' ? '午後' : 
                                   analysis.timeSlot === 'full' ? '終日' : 
                                   analysis.timeSlot === 'consult' ? '要相談' : analysis.timeSlot}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {analysis.totalRequired}人必要 / {analysis.totalAvailable}人応募
                                  {analysis.remainingRequired > 0 && (
                                    <span className="text-red-600 ml-1">(不足{analysis.remainingRequired}人)</span>
                                  )}
                                  {analysis.hasExcess && (
                                    <span className="text-yellow-600 ml-1">(余裕{analysis.totalAvailable - analysis.totalRequired}人)</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                              {analysis.timeSlot === 'consult' ? (
                                // 要相談の場合は薬剤師名を表示
                                <div>
                                  {analysis.requests.map((request: any) => {
                                    const pharmacistProfile = userProfiles[request.pharmacist_id];
                                    const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                    return (
                                      <div key={request.id} className="flex items-center justify-between">
                                        <span>{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                        <span className={`${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : analysis.isMatching ? (
                                <>
                                  {/* マッチング済みの薬剤師と薬局 */}
                                  {analysis.matchedPharmacists.length > 0 && (
                                    <div className="mb-1">
                                      <div className="text-sm font-medium text-green-700 mb-1">✅ マッチング済み:</div>
                                      {analysis.matchedPharmacists.map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const pharmacyProfile = userProfiles[analysis.matchedPharmacies[idx].pharmacy_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between">
                                            <span className="text-sm">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'} → {pharmacyProfile?.name || pharmacyProfile?.email || '名前未設定'}</span>
                                            <span className={`text-sm ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 未マッチングの薬剤師 */}
                                  {analysis.remainingRequired === 0 && analysis.hasExcess && (
                                    <div className="mt-1">
                                      <div className="text-sm font-medium text-orange-700 mb-1">⏳ 未マッチング:</div>
                                      {analysis.requests.slice(analysis.totalRequired).map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between">
                                            <span className="text-sm">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                            <span className={`text-sm ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm">
                                  {analysis.requests.length > 0 ? '薬剤師のみ応募' : '薬局のみ募集'}
                                </div>
                              )}
                              </div>
                            </div>
                          ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}

            
            <div className="text-xs text-gray-500">最終更新: {lastUpdated.toLocaleString('ja-JP')}</div>
          </div>
        </div>
      </div>

      {/* ユーザー一覧セクション */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ユーザー管理</h2>
        
        {(() => {
          const { pharmacies, pharmacists } = getOrganizedUserData();
          
          return (
            <div className="space-y-4">
              {/* 薬局一覧 */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('pharmacies')}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">
                    薬局一覧 ({pharmacies.length}件)
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.pharmacies ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSections.pharmacies && (
                  <div className="p-4 space-y-3">
                    {pharmacies.length === 0 ? (
                      <div className="text-sm text-gray-500">登録されている薬局はありません</div>
                    ) : (
                      pharmacies.map((pharmacy: any) => (
                        <div key={pharmacy.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-800">{pharmacy.name || '名前未設定'}</h4>
                            <span className="text-xs text-gray-500">{pharmacy.email}</span>
                          </div>
                          
                          {/* 店舗名 */}
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 mb-1">店舗名:</div>
                            <div className="text-sm">
                              {pharmacy.store_names && pharmacy.store_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pharmacy.store_names.map((storeName: string, idx: number) => (
                                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                      {storeName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500">未設定</span>
                              )}
                            </div>
                          </div>
                          
                          {/* NGリスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬剤師:</div>
                            <div className="text-sm">
                              {pharmacy.ng_list && pharmacy.ng_list.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pharmacy.ng_list.map((ngId: string, idx: number) => {
                                    const ngPharmacist = userProfiles[ngId];
                                    return (
                                      <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                        {ngPharmacist?.name || ngPharmacist?.email || ngId}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-500">なし</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 薬剤師一覧 */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('pharmacists')}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">
                    薬剤師一覧 ({pharmacists.length}件)
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.pharmacists ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSections.pharmacists && (
                  <div className="p-4 space-y-3">
                    {pharmacists.length === 0 ? (
                      <div className="text-sm text-gray-500">登録されている薬剤師はありません</div>
                    ) : (
                      pharmacists.map((pharmacist: any) => (
                        <div key={pharmacist.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-800">{pharmacist.name || '名前未設定'}</h4>
                            <span className="text-xs text-gray-500">{pharmacist.email}</span>
                          </div>
                          
                          {/* NGリスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬局:</div>
                            <div className="text-sm">
                              {pharmacist.ng_list && pharmacist.ng_list.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pharmacist.ng_list.map((ngId: string, idx: number) => {
                                    const ngPharmacy = userProfiles[ngId];
                                    return (
                                      <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                        {ngPharmacy?.name || ngPharmacy?.email || ngId}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-500">なし</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AdminDashboard;
