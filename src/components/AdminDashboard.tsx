import React, { useState, useEffect } from 'react';
import { Calendar, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, supabase } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assigned, setAssigned] = useState([]);
  const [requests, setRequests] = useState([]);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userProfiles, setUserProfiles] = useState<any>({});


  useEffect(() => {
    console.log('=== ADMIN DASHBOARD MOUNTED ===');
    console.log('User:', user);
    loadAll();
  }, [user, currentDate]);

  const loadAll = async () => {
    try {
      console.log('=== LOADALL START ===');
      console.log('Loading all data...');
      
      // 直接Supabaseからassigned_shiftsを取得
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setAssigned([]);
      } else {
        console.log('Loaded assigned shifts:', assignedData);
        setAssigned(assignedData || []);
      }
      
      const { data: r } = await shiftRequests.getRequests('', 'admin' as any);
      setRequests(r || []);
      const { data: p } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(p || []);
      
      // ユーザープロフィールを取得
      console.log('Fetching user profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');
      
      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
      } else {
        console.log('Loaded user profiles:', profilesData);
        const profilesMap: any = {};
        profilesData?.forEach((profile: any) => {
          profilesMap[profile.id] = profile;
        });
        console.log('User profiles map:', profilesMap);
        setUserProfiles(profilesMap);
        
        // 強制的にアラートで確認
        if (profilesData && profilesData.length > 0) {
          console.log('First profile:', profilesData[0]);
          alert(`プロフィール取得成功: ${profilesData.length}件のプロフィールを読み込みました`);
        } else {
          alert('プロフィールが取得できませんでした');
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

  const handleConfirmShifts = async () => {
    try {
      console.log('handleConfirmShifts called');
      console.log('Current requests:', requests);
      console.log('Current postings:', postings);
      
      // 希望シフトと募集シフトをマッチングして確定済みシフトを作成
      const confirmedShifts = [];
      
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
        alert(`シフトの確定に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      setSystemStatus('confirmed');
      setLastUpdated(new Date());
      alert(`${confirmedShifts.length}件のシフトを確定しました（重複は自動的に処理されました）`);
      
      // データを再読み込み
      loadAll();
    } catch (error) {
      console.error('Error in handleConfirmShifts:', error);
      alert(`シフトの確定に失敗しました: ${error.message || 'Unknown error'}`);
    }
  };

  const y = currentDate.getFullYear();
  const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const isSameDate = (d: number, target: string) => target === `${y}-${m}-${d.toString().padStart(2,'0')}`;

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

      <div className="flex gap-6">
        {/* left calendar */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
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
              <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((d, i) => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d?.toString().padStart(2, '0')}`;
              
              // その日の確定シフトを取得
              const dayAssignedShifts = assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed');
              
              // 確定シフトがある場合は、希望・募集は表示しない
              const hasConfirmedShifts = dayAssignedShifts.length > 0;
              
              return (
                <div key={i} className={`p-2 text-center text-sm border border-gray-200 min-h-[90px] ${d? '':'bg-gray-50'}`}>
                  {d && (
                    <>
                      <div className="font-medium">{d}</div>
                      
                      {/* 確定シフトがある場合 */}
                      {hasConfirmedShifts && (
                        <div className="relative group">
                          <div className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block cursor-pointer">
                            確定
                          </div>
                          
                                                     {/* マウスオーバーで表示される詳細情報 */}
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                             <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                               <div className="font-medium mb-2">確定シフト詳細</div>
                               {dayAssignedShifts.map((shift: any, index: number) => {
                                 const pharmacistProfile = userProfiles[shift.pharmacist_id];
                                 const pharmacyProfile = userProfiles[shift.pharmacy_id];
                                 console.log('Shift:', shift);
                                 console.log('Pharmacist profile:', pharmacistProfile);
                                 console.log('Pharmacy profile:', pharmacyProfile);
                                 console.log('User profiles:', userProfiles);
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
                      
                      {/* 確定シフトがない場合のみ、希望・募集を表示 */}
                      {!hasConfirmedShifts && (
                        <>
                          {/* requests */}
                          {requests.some((r:any)=>isSameDate(d, r.date)) && (
                            <div className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 mt-1 inline-block mr-1">希望</div>
                          )}
                          {/* postings */}
                          {postings.some((p:any)=>isSameDate(d, p.date)) && (
                            <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">募集</div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* right panel */}
        <div className="w-96 bg-white rounded-lg shadow border border-purple-200">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">管理者パネル</h2>
            <p className="text-sm text-purple-100 mt-1">システム全体の状態管理と調整</p>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={handleConfirmShifts}
              disabled={systemStatus === 'confirmed'}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium ${
                systemStatus === 'confirmed' 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフトを確定する'}</span>
            </button>
            
            {/* デバッグボタン */}
            <button 
              onClick={async () => {
                console.log('=== DEBUG BUTTON CLICKED ===');
                console.log('Current user:', user);
                console.log('Current assigned shifts:', assigned);
                console.log('Current user profiles:', userProfiles);
                console.log('Current requests:', requests);
                console.log('Current postings:', postings);
                
                // 強制的にデータを再読み込み
                await loadAll();
                
                // 特定のシフトの詳細をログ出力
                if (assigned.length > 0) {
                  const firstShift = assigned[0];
                  console.log('First assigned shift:', firstShift);
                  const pharmacistProfile = userProfiles[firstShift.pharmacist_id];
                  const pharmacyProfile = userProfiles[firstShift.pharmacy_id];
                  console.log('Pharmacist profile for first shift:', pharmacistProfile);
                  console.log('Pharmacy profile for first shift:', pharmacyProfile);
                  console.log('Pharmacist name:', pharmacistProfile?.name || 'NOT FOUND');
                  console.log('Pharmacy name:', pharmacyProfile?.name || 'NOT FOUND');
                }
                
                alert('デバッグ情報をコンソールに出力しました。F12キーでコンソールを確認してください。');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 text-sm"
            >
              <span>デバッグ情報出力</span>
            </button>
            

            
            {/* 統計情報 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">シフト統計</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-blue-600 font-medium">希望</div>
                  <div className="text-blue-800">{requests.length}件</div>
                </div>
                <div className="bg-orange-50 p-2 rounded">
                  <div className="text-orange-600 font-medium">募集</div>
                  <div className="text-orange-800">{postings.length}件</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-green-600 font-medium">確定</div>
                  <div className="text-green-800">{assigned.filter((s: any) => s.status === 'confirmed').length}件</div>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-purple-600 font-medium">マッチング可能</div>
                  <div className="text-purple-800">
                    {requests.filter((r: any) => 
                      postings.some((p: any) => p.date === r.date && p.time_slot === r.time_slot)
                    ).length}件
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">最終更新: {lastUpdated.toLocaleString('ja-JP')}</div>
            
            {/* ユーザー管理セクション */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">ユーザー管理</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.values(userProfiles).map((profile: any) => (
                  <div key={profile.id} className="text-xs bg-white p-2 rounded border">
                    <div className="font-medium">{profile.name || '名前未設定'}</div>
                    <div className="text-gray-600">{profile.email}</div>
                    <div className="text-gray-500">タイプ: {profile.user_type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
