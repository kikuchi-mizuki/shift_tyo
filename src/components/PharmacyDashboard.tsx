import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, MessageCircle, Sun, Users } from 'lucide-react';
import { shifts, shiftPostings, supabase } from '../lib/supabase';

// デバッグ: インポートの確認
console.log('PharmacyDashboard imports:', { shifts, shiftPostings });

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [requiredStaff, setRequiredStaff] = useState<number | null>(1); // デフォルトで1人を選択
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [storeNames, setStoreNames] = useState<string[]>([]);
  
  // storeNamesの状態変更を監視
  useEffect(() => {
    console.log('=== STORENAMES STATE CHANGED ===');
    console.log('New storeNames value:', storeNames);
    console.log('storeNames length:', storeNames.length);
    console.log('storeNames type:', typeof storeNames);
    console.log('storeNames is array:', Array.isArray(storeNames));
    console.log('=== STORENAMES STATE CHANGED END ===');
  }, [storeNames]);
  const [newStoreName, setNewStoreName] = useState('');
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [ngList, setNgList] = useState<string[]>([]); // NG薬剤師ID
  const [selectedNgPharmacistId, setSelectedNgPharmacistId] = useState('');
  const [allPharmacists, setAllPharmacists] = useState<any[]>([]);

  useEffect(() => {
    console.log('PharmacyDashboard mounted, user:', user);
    // 1) ローカルキャッシュから即座に復元（UX向上）
    try {
      const cachedStores = localStorage.getItem(`store_names_${user?.id || ''}`);
      if (cachedStores) {
        const parsed = JSON.parse(cachedStores);
        if (Array.isArray(parsed)) setStoreNames(parsed);
      }
      const cachedSelected = localStorage.getItem(`selected_store_${user?.id || ''}`);
      if (cachedSelected) setSelectedStoreName(cachedSelected);
    } catch {}
    // 2) サーバーデータを正とする
    loadData();
  }, [user]);

  // メモに埋め込んだ [store:◯◯] から店舗名を抽出（store_name が無いときのフォールバック）
  // function 宣言でTDZを回避（先に利用されてもOK）
  function extractStoreName(shift: any): string {
    const direct = (shift?.store_name || '').trim();
    if (direct) return direct;
    if (typeof shift?.memo === 'string') {
      const m = shift.memo.match(/\[store:([^\]]+)\]/);
      if (m && m[1]) return m[1];
    }
    return '';
  }

  // 店舗名リストが取得できたら、未選択の場合は先頭を自動選択
  // ドロップダウン候補（プロフィール登録 + これまでの募集から抽出）のユニオン
  const storeOptions: string[] = Array.from(new Set([
    ...(storeNames || []),
    ...((myShifts || []).map((s: any) => extractStoreName(s)).filter(Boolean))
  ]));

  useEffect(() => {
    if (!selectedStoreName && storeOptions && storeOptions.length > 0) {
      setSelectedStoreName(storeOptions[0]);
    }
  }, [storeOptions]);

  // 変更があればローカルにキャッシュ
  useEffect(() => {
    try {
      localStorage.setItem(`store_names_${user?.id || ''}`, JSON.stringify(storeOptions));
    } catch {}
  }, [storeOptions, user?.id]);

  useEffect(() => {
    try {
      if (selectedStoreName) {
        localStorage.setItem(`selected_store_${user?.id || ''}`, selectedStoreName);
      }
    } catch {}
  }, [selectedStoreName, user?.id]);

  const loadData = async () => {
    try {
      console.log('=== loadData START ===');
      console.log('Loading pharmacy data for user:', user.id);
      
      // 募集シフトを取得
      console.log('Calling shiftPostings.getPostings...');
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (myShiftsError) {
        console.error('Error loading shift postings:', myShiftsError);
        setMyShifts([]);
      } else {
        console.log('Loaded shift postings:', myShiftsData);
        console.log('Setting myShifts state with:', myShiftsData);
        setMyShifts(myShiftsData || []);
      }
      
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
        console.log('=== PROFILE DATA LOADED ===');
        console.log('Full profile data:', profileData);
        console.log('store_names from DB:', profileData.store_names);
        console.log('store_names type:', typeof profileData.store_names);
        console.log('store_names is array:', Array.isArray(profileData.store_names));
        
        const storeNamesFromDB = profileData.store_names || [];
        console.log('Setting storeNames to:', storeNamesFromDB);
        setProfileName(profileData.name || '');
        setStoreNames(storeNamesFromDB);
        setNgList(profileData.ng_list || []);
        
        console.log('=== PROFILE DATA LOADED END ===');
      } else {
        console.log('Profile data load error:', profileError);
        console.log('Profile data:', profileData);
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
      console.log('=== loadData END ===');
      setLoading(false);
    }
  };

  // NG対象候補として全薬剤師のリストを取得
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id,name,email')
          .eq('user_type', 'pharmacist');
        setAllPharmacists(data || []);
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

    const days = [] as (number|null)[];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getMonthName = (date: Date) => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // 備考から [store:◯◯] タグを取り除く（UI表示用）
  const stripStoreTag = (text: any) => {
    if (typeof text !== 'string') return '';
    return text.replace(/\[store:[^\]]+\]\s*/g, '').trim();
  };

  // （上でfunction宣言したのでここは削除）

  const handleDateSelect = (day: number) => {
    if (!day) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    
    // 新しい日付の場合はフォームをリセット
    setTimeSlot('');
    setRequiredStaff(null);
    setMemo('');
    // 店舗名はリセットしない（ユーザーが選択した店舗名を保持）
  };

  const handleAddStoreName = () => {
    console.log('=== ADD STORE NAME START ===');
    console.log('New store name:', newStoreName);
    console.log('Current store names:', storeNames);
    
    if (newStoreName.trim() && !storeNames.includes(newStoreName.trim())) {
      const newStoreNames = [...storeNames, newStoreName.trim()];
      console.log('Setting new store names:', newStoreNames);
      setStoreNames(newStoreNames);
      setNewStoreName('');
      console.log('Store name added successfully');
      
      // 即座にプロフィールを更新してテスト
      console.log('Auto-updating profile with new store names...');
      setTimeout(() => {
        handleProfileUpdate();
      }, 100);
    } else {
      console.log('Store name not added - either empty or already exists');
    }
    
    console.log('=== ADD STORE NAME END ===');
  };

  const handleRemoveStoreName = (storeNameToRemove: string) => {
    setStoreNames(storeNames.filter(name => name !== storeNameToRemove));
  };

  const handleProfileUpdate = async () => {
    try {
      console.log('=== PROFILE UPDATE START ===');
      console.log('User ID:', user.id);
      console.log('Profile name:', profileName);
      console.log('Store names to save:', storeNames);
      console.log('Store names type:', typeof storeNames);
      console.log('Store names length:', storeNames.length);
      console.log('NG list:', ngList);
      
      // まず現在のプロフィールデータを確認
      console.log('Checking current profile data...');
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Current profile data:', currentProfile);
      console.log('Current store_names in DB:', currentProfile?.store_names);
      console.log('Fetch error:', fetchError);
      
      // store_namesを直接保存（カラム存在チェックを削除）
      let updateData: any = { 
        name: profileName, 
        ng_list: ngList,
        store_names: storeNames
      };
      
      console.log('Saving store_names directly:', storeNames);
      console.log('Store names JSON stringified:', JSON.stringify(storeNames));
      
      console.log('Final update data:', updateData);
      console.log('Final update data JSON:', JSON.stringify(updateData));
      
      console.log('Executing update query with data:', updateData);
      console.log('User ID for update:', user.id);
      
      // Railwayログで確認できるようにサーバーサイドログを送信
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'log',
            message: `[PHARMACY_PROFILE_UPDATE] User ${user.id} updating profile`,
            data: {
              userId: user.id,
              storeNames: storeNames,
              updateData: updateData
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.warn('Failed to send log to Railway:', logError);
      }
      
      const { data: updateResult, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();
      
      console.log('Update result:', { data: updateResult, error });
      console.log('Update result data:', updateResult);
      console.log('Update result error:', error);
      
      // 更新結果もRailwayログに送信
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'log',
            message: `[PHARMACY_PROFILE_UPDATE_RESULT] User ${user.id} profile update completed`,
            data: {
              userId: user.id,
              success: !error,
              error: error,
              result: updateResult
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.warn('Failed to send result log to Railway:', logError);
      }
      
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
          console.log('Updated store_names:', updateResult[0].store_names);
        }
        
        alert('プロフィールを更新しました');
        setShowProfileEdit(false);
        // 成功時はローカルキャッシュも更新
        try {
          localStorage.setItem(`store_names_${user?.id || ''}`, JSON.stringify(storeNames));
        } catch {}
      }
      
      console.log('=== PROFILE UPDATE END ===');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  const addNgPharmacist = () => {
    if (selectedNgPharmacistId && !ngList.includes(selectedNgPharmacistId)) {
      setNgList([...ngList, selectedNgPharmacistId]);
      setSelectedNgPharmacistId('');
    }
  };
  const removeNgPharmacist = (id: string) => {
    setNgList(ngList.filter(x => x !== id));
  };

  const handlePost = async () => {
    console.log('=== handlePost START ===');
    console.log('handlePost called', { selectedDate, timeSlot, requiredStaff, memo });
    
    // 既存の募集があるかチェック（同日・同店舗名で判断）
    console.log('=== HANDLEPOST DEBUG ===');
    console.log('selectedDate:', selectedDate);
    console.log('selectedStoreName:', selectedStoreName);
    console.log('myShifts:', myShifts);
    
    const existingPosting = myShifts.find((s: any) => {
      if (s.date !== selectedDate) return false;
      
      // カレンダー表示と同じロジックで店舗名を取得
      const direct = (s.store_name || '').trim();
      let fromMemo = '';
      if (!direct && typeof s.memo === 'string') {
        const m = s.memo.match(/\[store:([^\]]+)\]/);
        if (m && m[1]) fromMemo = m[1];
      }
      const sStoreName = direct || fromMemo;
      const selectedStore = (selectedStoreName || '').trim();
      
      console.log('Comparing store names:', { sStoreName, selectedStore, match: sStoreName === selectedStore });
      
      // 両方とも空の場合は同じ店舗名とみなす
      if (sStoreName === '' && selectedStore === '') return true;
      
      // 通常の文字列比較
      return sStoreName === selectedStore;
    });
    
    console.log('existingPosting found:', existingPosting);
    
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
          setSelectedDate('');
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
      // 新しい募集を作成（同日でも店舗名が異なれば追加可）
      try {
        const posting = {
          pharmacy_id: user.id,
          date: selectedDate,
          store_name: selectedStoreName,
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
        
        // フォームをリセット（店舗名は保持）
        setSelectedDate('');
        setTimeSlot('');
        setRequiredStaff(null);
        setMemo('');
        
        alert('募集を作成しました');
        // 募集データのみを再読み込み（プロフィールデータは保持）
        const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
        if (!myShiftsError) {
          setMyShifts(myShiftsData || []);
        }
        
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
  console.log('Calendar data:', { myShifts: myShifts.length, confirmedShifts: confirmedShifts.length });
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6">
      {/* 左: カレンダー */}
      <div className="flex-1 bg-white rounded-lg shadow p-4 lg:p-6">
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
              className={`p-2 text-center text-sm border border-gray-200 min-h-[72px] ${
                day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
              } ${
                selectedDate === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  ? 'bg-blue-100 border-blue-300'
                  : ''
              }`}
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
                  {/* 確定シフトがない場合のみ募集中シフト（青色）を表示 */}
                  {confirmedShifts.filter((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`).length === 0 && 
                   myShifts.filter((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`).map((shift: any, index: number) => (
                    (() => {
                      // 店舗名のみを表示（store_name -> memoのタグ の順で取得）
                      const direct = (shift.store_name || '').trim();
                      let fromMemo = '';
                      if (!direct && typeof shift.memo === 'string') {
                        const m = shift.memo.match(/\[store:([^\]]+)\]/);
                        if (m && m[1]) fromMemo = m[1];
                      }
                      const name = direct || fromMemo;
                      return name ? (
                        <div key={`recruiting-${index}`} className="text-[8px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">{name}</div>
                      ) : null;
                    })()
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右: シフト募集フォーム */}
      <div className="w-full lg:w-96 bg-white rounded-lg shadow">
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
        <div className="p-4 lg:p-6 space-y-6">
          {/* プロフィール編集フォーム */}
          {showProfileEdit && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">薬局名の設定</h3>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="薬局名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">店舗名の管理</h3>
                <div className="space-y-2">
                  {/* 店舗名追加フォーム */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="新しい店舗名（例：渋谷店）"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStoreName()}
                    />
                    <button
                      onClick={handleAddStoreName}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      追加
                    </button>
                  </div>
                  
                  {/* 登録済み店舗名一覧 */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">登録済み店舗名: ({storeNames.length}件)</p>
                    {storeNames.length > 0 ? (
                      storeNames.map((name, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm">{name}</span>
                          <button
                            onClick={() => handleRemoveStoreName(name)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            削除
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                        店舗名が登録されていません
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">NG薬剤師の設定</h3>
                <div className="flex space-x-2 mb-2">
                  <select
                    value={selectedNgPharmacistId}
                    onChange={(e) => setSelectedNgPharmacistId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">薬剤師を選択</option>
                    {allPharmacists.map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.email}</option>
                    ))}
                  </select>
                  <button onClick={addNgPharmacist} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">追加</button>
                </div>
                {ngList.length > 0 && (
                  <div className="space-y-1">
                    {ngList.map((id) => (
                      <div key={id} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">{allPharmacists.find(p => p.id === id)?.name || id}</span>
                        <button onClick={() => removeNgPharmacist(id)} className="text-red-600 hover:text-red-800 text-sm">削除</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleProfileUpdate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                更新
              </button>
            </div>
          )}
          
          {/* 概要（当日の全店舗分を表示） */}
          <div className="p-3 bg-gray-100 rounded text-xs">
            <div className="font-medium text-gray-700 mb-1">選択日: {selectedDate || '未選択'}</div>
            {selectedDate ? (
              <div className="space-y-1">
                {myShifts
                  .filter((s: any) => s.date === selectedDate)
                  .map((s: any, idx: number) => {
                    // カレンダー表示と同じロジックを使用
                    const direct = (s.store_name || '').trim();
                    let fromMemo = '';
                    if (!direct && typeof s.memo === 'string') {
                      const m = s.memo.match(/\[store:([^\]]+)\]/);
                      if (m && m[1]) fromMemo = m[1];
                    }
                    const name = direct || fromMemo;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white rounded border px-2 py-1">
                        <div className="text-gray-800">店舗: {name || '（店舗名未設定）'}</div>
                        <div className="text-gray-500">{s.time_slot === 'morning' ? '午前' : s.time_slot === 'afternoon' ? '午後' : s.time_slot === 'full' ? '終日' : s.time_slot === 'consult' ? '要相談' : s.time_slot} / {s.required_staff || 1}人</div>
                      </div>
                    );
                  })}
                {myShifts.filter((s: any) => s.date === selectedDate).length === 0 && (
                  <div className="text-gray-500">この日付の募集はありません</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">日付を選択してください</div>
            )}
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

          {/* 店舗名選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
            <select
              value={selectedStoreName}
              onChange={(e) => setSelectedStoreName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">店舗名を選択してください</option>
              {storeOptions.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
              <option value="">店舗名なし</option>
            </select>
            {storeNames.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                店舗名を設定するには「プロフィール編集」から設定してください
              </p>
            )}
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
                (() => {
                  const existing = myShifts.find((s: any) => {
                    if (s.date !== selectedDate) return false;
                    
                    // カレンダー表示と同じロジックで店舗名を取得
                    const direct = (s.store_name || '').trim();
                    let fromMemo = '';
                    if (!direct && typeof s.memo === 'string') {
                      const m = s.memo.match(/\[store:([^\]]+)\]/);
                      if (m && m[1]) fromMemo = m[1];
                    }
                    const sStoreName = direct || fromMemo;
                    const selectedStore = (selectedStoreName || '').trim();
                    
                    if (sStoreName === '' && selectedStore === '') return true;
                    return sStoreName === selectedStore;
                  });
                  return existing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700';
                })()
              }`}
            >
              {(() => {
                const existing = myShifts.find((s: any) => {
                  if (s.date !== selectedDate) return false;
                  
                  // カレンダー表示と同じロジックで店舗名を取得
                  const direct = (s.store_name || '').trim();
                  let fromMemo = '';
                  if (!direct && typeof s.memo === 'string') {
                    const m = s.memo.match(/\[store:([^\]]+)\]/);
                    if (m && m[1]) fromMemo = m[1];
                  }
                  const sStoreName = direct || fromMemo;
                  const selectedStore = (selectedStoreName || '').trim();
                  
                  if (sStoreName === '' && selectedStore === '') return true;
                  return sStoreName === selectedStore;
                });
                
                return existing ? '募集を削除' : '募集を追加';
              })()}
            </button>
          )}
        </div>

        {/* 注意ボックス */}
        <div className="px-4 lg:px-6 pb-4 lg:pb-6">
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
