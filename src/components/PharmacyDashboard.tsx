import React, { useState, useEffect } from 'react';
import { Building2, Calendar as CalendarIcon, Plus, MessageCircle, Sun, Users } from 'lucide-react';
import { shifts, shiftPostings, supabase } from '../lib/supabase';

// デバッグ: インポートの確認
console.log('PharmacyDashboard imports:', { shifts, shiftPostings });

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [requiredStaff, setRequiredStaff] = useState<number | null>(1); // デフォルトで1人を選択
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [userProfiles, setUserProfiles] = useState<any>({});

  useEffect(() => {
    console.log('PharmacyDashboard mounted, user:', user);
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      console.log('Loading pharmacy data...');
      
      // 募集シフトを取得
      const { data: myShiftsData } = await shifts.getShiftsByUser(user.id, 'pharmacy');
      setMyShifts(myShiftsData || []);
      
      // 直接Supabaseから確定済みシフトを取得
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('pharmacy_id', user.id)
        .eq('status', 'confirmed');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setConfirmedShifts([]);
      } else {
        console.log('Loaded confirmed shifts:', assignedData);
        setConfirmedShifts(assignedData || []);
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
      
      // シフトに関連する薬剤師のプロフィールを取得
      if (assignedData && assignedData.length > 0) {
        const pharmacistIds = [...new Set(assignedData.map((shift: any) => shift.pharmacist_id))];
        const { data: pharmacistProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', pharmacistIds);
        
        if (pharmacistProfiles) {
          const profilesMap: any = {};
          pharmacistProfiles.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
          setUserProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

    const days = [] as (number|null)[];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getMonthName = (date: Date) => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateSelect = (day: number) => {
    if (!day) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    
    // 既存の募集がある場合は自動選択
    const existingPosting = myShifts.find((s: any) => s.date === formattedDate);
    if (existingPosting) {
      console.log('Found existing posting for date', existingPosting);
      setTimeSlot(existingPosting.time_slot);
      setRequiredStaff(existingPosting.required_staff);
      setMemo(existingPosting.memo || '');
    } else {
      // 新しい日付の場合はフォームをリセット
      setTimeSlot('');
      setRequiredStaff(null);
      setMemo('');
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

  const handlePost = async () => {
    console.log('=== handlePost START ===');
    console.log('handlePost called', { selectedDate, timeSlot, requiredStaff, memo });
    
    // 既存の募集があるかチェック
    const existingPosting = myShifts.find((s: any) => s.date === selectedDate);
    
    if (existingPosting) {
      // 既存の募集がある場合は削除
      if (confirm('この日付の募集を削除しますか？')) {
        try {
          const { error } = await supabase
            .from('shift_postings')
            .delete()
            .eq('id', existingPosting.id);
          
          if (error) {
            console.error('Shift posting deletion error:', error);
            alert('募集の削除に失敗しました');
            return;
          }
          
          alert('募集を削除しました');
          setTimeSlot('');
          setRequiredStaff(null);
          setMemo('');
          loadData();
        } catch (e) {
          console.error('Exception in handlePost deletion:', e);
          alert('募集の削除に失敗しました');
        }
      }
    } else {
      // 新しい募集を作成
      try {
        const posting = {
          pharmacy_id: user.id,
          date: selectedDate,
          time_slot: timeSlot,
          required_staff: requiredStaff,
          memo,
          status: 'open'
        };
        
        console.log('Creating posting:', posting);
        
        // Supabaseに保存
        console.log('Saving to Supabase');
        const { error } = await shiftPostings.createPostings([posting]);
        
        if (error) {
          console.error('Shift posting error:', error);
          alert('募集の作成に失敗しました');
          return;
        }
        
        // フォームをリセット
        setTimeSlot('');
        setRequiredStaff(null);
        setMemo('');
        
        alert('募集を作成しました');
        loadData();
        
      } catch (e) {
        console.error('Exception in handlePost:', e);
        alert('募集の作成に失敗しました');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('PharmacyDashboard rendering, loading:', loading, 'user:', user);
  console.log('Form state:', { selectedDate, timeSlot, requiredStaff, memo });
  
  return (
    <div className="flex gap-6 p-6">
      {/* 左: カレンダー */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
            <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
          </div>
        </div>

        <div className="bg-blue-600 text-white px-5 py-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {['日','月','火','水','木','金','土'].map(d => (
            <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth(currentDate).map((day, idx) => (
            <div
              key={idx}
              className={`p-2 text-center text-sm border border-gray-200 min-h-[72px] ${day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}`}
              onClick={() => day && handleDateSelect(day)}
            >
              {day && (
                <>
                  <div className="font-medium">{day}</div>
                  {/* 確定済みシフト（緑色） */}
                  {confirmedShifts.filter((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`).map((shift: any, index: number) => (
                    <div key={`confirmed-${index}`} className="relative group">
                      <div className="text-[8px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block cursor-pointer">
                        ✓{shift.time_slot === 'morning' ? '午前' : 
                          shift.time_slot === 'afternoon' ? '午後' : 
                          shift.time_slot === 'full' ? '終日' : 
                          shift.time_slot === 'consult' ? '要相談' : shift.time_slot}
                        {shift.required_staff}人
                      </div>
                      
                      {/* マウスオーバーで表示される詳細情報 */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
                          <div className="font-medium mb-2">確定シフト詳細</div>
                          <div className="mb-2 last:mb-0 border-b border-gray-600 pb-2 last:border-b-0">
                            <div className="text-green-300 font-medium">
                              時間: {shift.time_slot === 'morning' ? '午前' : shift.time_slot === 'afternoon' ? '午後' : '夜間'}
                            </div>
                            <div className="text-blue-300">
                              薬剤師: {userProfiles[shift.pharmacist_id]?.name || userProfiles[shift.pharmacist_id]?.email || shift.pharmacist_id}
                            </div>
                          </div>
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 absolute top-full left-1/2 transform -translate-x-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* 募集中シフト（青色） */}
                  {myShifts.filter((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`).map((shift: any, index: number) => (
                    <div key={`recruiting-${index}`} className="text-[8px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">
                      {shift.time_slot === 'morning' ? '午前' : 
                       shift.time_slot === 'afternoon' ? '午後' : 
                       shift.time_slot === 'full' ? '終日' : 
                       shift.time_slot === 'consult' ? '要相談' : shift.time_slot}
                      {shift.required_staff}人
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右: シフト募集フォーム */}
      <div className="w-96 bg-white rounded-lg shadow">
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <h2 className="text-xl font-semibold">薬剤師募集登録</h2>
            </div>
            <button
              onClick={() => setShowProfileEdit(!showProfileEdit)}
              className="text-sm text-blue-100 hover:text-white"
            >
              プロフィール編集
            </button>
          </div>
          <p className="text-xs text-blue-100 mt-1">必要な薬剤師の募集条件を設定してください</p>
        </div>
        <div className="p-6 space-y-6">
          {/* プロフィール編集フォーム */}
          {showProfileEdit && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">名前の設定</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="薬局名"
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
          
          {/* デバッグ情報 */}
          <div className="p-3 bg-gray-100 rounded text-xs">
            <div>選択日: {selectedDate || '未選択'}</div>
            <div>時間帯: {timeSlot || '未選択'}</div>
            <div>人数: {requiredStaff || '未選択'}</div>
            <div>備考: {memo || 'なし'}</div>
          </div>
          
          {/* 募集日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集日</label>
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
                const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                return <option key={day} value={date}>{month}月{day}日</option>;
              })}
            </select>
          </div>

          {/* 時間帯 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集時間帯</label>
            <div className="grid grid-cols-2 gap-2">
                              {[{id:'morning',label:'午前 (9:00-13:00)',icon:Sun,color:'bg-green-500 hover:bg-green-600'},
                {id:'afternoon',label:'午後 (13:00-18:00)',icon:Sun,color:'bg-orange-500 hover:bg-orange-600'},
                {id:'full',label:'終日 (9:00-18:00)',icon:Users,color:'bg-yellow-500 hover:bg-yellow-600'},
                {id:'consult',label:'要相談',icon:MessageCircle,color:'bg-purple-500 hover:bg-purple-600'}].map(slot=>{
                  const Icon = slot.icon as any;
                  return (
                    <button 
                      key={slot.id} 
                      onClick={() => {
                        console.log('Time slot clicked:', slot.id);
                        setTimeSlot(slot.id);
                      }} 
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${timeSlot===slot.id?slot.color:'bg-gray-300 hover:bg-gray-400'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 募集人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">必要人数</label>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(n => (
                <button 
                  key={n} 
                  onClick={() => {
                    console.log('Required staff clicked:', n);
                    setRequiredStaff(n);
                  }} 
                  className={`flex items-center justify-center space-x-2 p-3 rounded-lg text-sm font-medium border ${requiredStaff===n? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  <Users className="w-4 h-4" />
                  <span>{n}人</span>
                </button>
              ))}
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考・特記事項（任意）</label>
            <textarea value={memo} onChange={(e)=>setMemo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" rows={3} placeholder="経験年数の要件、特別な業務内容、その他の条件があれば記入してください" />
          </div>

          {/* 作成/削除ボタン */}
          {confirmedShifts.find((s: any) => s.date === selectedDate) ? (
            <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium">
              確定済みのため編集できません
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => {
                console.log('=== BUTTON CLICK START ===');
                console.log('Form state:', { selectedDate, timeSlot, requiredStaff, memo });
                
                if (!selectedDate || !timeSlot || !requiredStaff) {
                  alert('募集日・時間帯・人数を選択してください');
                  return;
                }
                
                console.log('Validation passed, calling handlePost');
                handlePost();
              }}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
                myShifts.find((s: any) => s.date === selectedDate)
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {myShifts.find((s: any) => s.date === selectedDate) ? '募集を削除' : '募集を追加'}
            </button>
          )}
        </div>

        {/* 注意ボックス */}
        <div className="px-6 pb-6">
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>月初に必要人数を全ての日程へ一括登録することをお勧めします</li>
              <li>「終日」は選択すると募集要件を明確にしてください</li>
              <li>NG薬局の設定は別途管理画面で行えます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
