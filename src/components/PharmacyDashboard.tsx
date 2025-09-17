import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Sun, Users } from 'lucide-react';
import { shifts, shiftPostings, systemStatus, storeNgPharmacists, supabase } from '../lib/supabase';

// デバッグ: インポートの確認
console.log('PharmacyDashboard imports:', { shifts, shiftPostings });

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [requiredStaff, setRequiredStaff] = useState<number | null>(1); // デフォルトで1人を選択
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [storeNames, setStoreNames] = useState<string[]>([]);
  // 募集登録での店舗名は一時保存は残しつつ単一選択へ
  const [singleStoreName, setSingleStoreName] = useState('');
  const [batchStoreNames, setBatchStoreNames] = useState<string[]>([]); // 追加リスト
  const [isSystemConfirmed, setIsSystemConfirmed] = useState(false);
  // quick add input removed per request

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
  
  const [newStoreName, setNewStoreName] = useState('');
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [ngList, setNgList] = useState<string[]>([]); // NG薬剤師ID（薬局全体）
  const [selectedNgPharmacistId, setSelectedNgPharmacistId] = useState(''); // 薬局全体用
  const [storeNgLists, setStoreNgLists] = useState<{[storeName: string]: string[]}>({}); // 店舗毎のNG薬剤師ID
  const [selectedStoreForNg, setSelectedStoreForNg] = useState('');
  const [selectedStoreNgPharmacistId, setSelectedStoreNgPharmacistId] = useState(''); // 店舗毎用
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
  ])).filter(name => name && name.trim() !== ''); // 空文字列を除外

  useEffect(() => {
    if (!singleStoreName && storeOptions && storeOptions.length > 0) {
      setSingleStoreName(storeOptions[0]);
    }
  }, [storeOptions, singleStoreName]);

  // storeNamesの状態変更を監視
  useEffect(() => {
    console.log('=== STORENAMES STATE CHANGED ===');
    console.log('New storeNames value:', storeNames);
    console.log('storeNames length:', storeNames.length);
    console.log('storeNames type:', typeof storeNames);
    console.log('storeNames is array:', Array.isArray(storeNames));
    console.log('=== STORENAMES STATE CHANGED END ===');
  }, [storeNames]);

  // storeNgListsの状態変更を監視
  useEffect(() => {
    console.log('=== STORENG LISTS STATE CHANGED ===');
    console.log('New storeNgLists value:', storeNgLists);
    console.log('storeNgLists keys:', Object.keys(storeNgLists));
    console.log('=== STORENG LISTS STATE CHANGED END ===');
  }, [storeNgLists]);

  // storeNamesとallPharmacistsの状態を監視
  useEffect(() => {
    console.log('Store names for NG selection:', storeNames);
    console.log('Available pharmacists for NG selection:', allPharmacists);
  }, [storeNames, allPharmacists]);

  // confirmedShiftsが更新された時に薬剤師プロフィールを再取得
  useEffect(() => {
    const fetchPharmacistProfiles = async () => {
      if (confirmedShifts && confirmedShifts.length > 0) {
        const pharmacistIds = [...new Set(confirmedShifts.map((shift: any) => shift.pharmacist_id))];
        console.log('Confirmed shifts updated, fetching pharmacist profiles for:', pharmacistIds);
        
        const { data: pharmacistProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', pharmacistIds);
        
        if (profileError) {
          console.error('Error fetching pharmacist profiles from confirmedShifts:', profileError);
        } else if (pharmacistProfiles) {
          const profilesMap: any = {};
          pharmacistProfiles.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
          setUserProfiles(prev => ({ ...prev, ...profilesMap }));
          console.log('Updated userProfiles from confirmedShifts:', profilesMap);
        }
      }
    };
    
    fetchPharmacistProfiles();
  }, [confirmedShifts]);

  // 変更があればローカルにキャッシュ
  useEffect(() => {
    try {
      localStorage.setItem(`store_names_${user?.id || ''}`, JSON.stringify(storeOptions));
    } catch {}
  }, [storeOptions, user?.id]);


  const loadData = async () => {
    try {
      console.log('=== loadData START ===');
      console.log('Loading pharmacy data for user:', user.id);
      
      // システム状態を取得
      const { data: systemStatusData, error: systemStatusError } = await systemStatus.getSystemStatus();
      if (!systemStatusError && systemStatusData) {
        setIsSystemConfirmed(systemStatusData.status === 'confirmed');
      }
      
      // 募集シフトを取得
      console.log('Calling shiftPostings.getPostings...');
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (myShiftsError) {
        console.error('Error loading shift postings:', myShiftsError);
        setMyShifts([]);
      } else {
        console.log('Loaded shift postings:', myShiftsData);
        console.log('Shift postings detailed analysis:', myShiftsData?.map((posting: any) => ({
          id: posting.id,
          date: posting.date,
          time_slot: posting.time_slot,
          required_staff: posting.required_staff,
          required_people: posting.required_people,
          store_name: posting.store_name,
          memo: posting.memo,
          status: posting.status,
          pharmacy_id: posting.pharmacy_id
        })));
        console.log('Setting myShifts state with:', myShiftsData);
        setMyShifts(myShiftsData || []);
      }
      
      // 直接Supabaseから確定済みシフトを取得
      console.log('Attempting to load assigned shifts for pharmacy_id:', user.id);
      console.log('Supabase client status:', {
        url: supabase.supabaseUrl,
        hasAuth: !!supabase.auth,
        currentUser: await supabase.auth.getUser()
      });
      
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('pharmacy_id', user.id)
        .eq('status', 'confirmed');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', {
          error: assignedError,
          code: assignedError.code,
          message: assignedError.message,
          details: assignedError.details,
          hint: assignedError.hint,
          pharmacy_id: user.id
        });
        
        // RLSポリシーの問題の可能性があるため、代替手段を試行
        console.log('Trying alternative query without status filter...');
        const { data: altData, error: altError } = await supabase
          .from('assigned_shifts')
          .select('*')
          .eq('pharmacy_id', user.id);
        
        if (altError) {
          console.error('Alternative query also failed:', altError);
          setConfirmedShifts([]);
        } else {
          console.log('Alternative query succeeded:', altData);
          // statusでフィルタリング
          const confirmedData = altData?.filter((shift: any) => shift.status === 'confirmed') || [];
          setConfirmedShifts(confirmedData);
        }
      } else {
        console.log('Loaded confirmed shifts:', assignedData);
        console.log('Confirmed shifts detailed analysis:', assignedData?.map((shift: any) => ({
          id: shift.id,
          date: shift.date,
          time_slot: shift.time_slot,
          time_slot_type: typeof shift.time_slot,
          pharmacist_id: shift.pharmacist_id,
          pharmacy_id: shift.pharmacy_id,
          status: shift.status,
          store_name: shift.store_name,
          memo: shift.memo,
          has_store_name: !!shift.store_name,
          has_memo: !!shift.memo
        })));
        setConfirmedShifts(assignedData || []);
      }
      
      // 募集人数と確定人数の比較分析
      console.log('=== RECRUITMENT VS CONFIRMED ANALYSIS ===');
      if (myShiftsData && assignedData) {
        myShiftsData.forEach((posting: any) => {
          const confirmedForThisPosting = assignedData.filter((shift: any) => 
            shift.date === posting.date && 
            shift.time_slot === posting.time_slot &&
            shift.pharmacy_id === posting.pharmacy_id
          );
          
          console.log('Posting vs Confirmed comparison:', {
            posting_id: posting.id,
            date: posting.date,
            time_slot: posting.time_slot,
            store_name: posting.store_name,
            required_staff: posting.required_staff,
            required_people: posting.required_people,
            confirmed_count: confirmedForThisPosting.length,
            confirmed_shifts: confirmedForThisPosting.map(s => ({
              id: s.id,
              pharmacist_id: s.pharmacist_id,
              status: s.status
            })),
            is_over_recruited: confirmedForThisPosting.length > (posting.required_staff || posting.required_people || 1)
          });
        });
      }
      console.log('=== RECRUITMENT VS CONFIRMED ANALYSIS END ===');
      
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
        
        // 店舗毎のNG薬剤師設定を取得
        console.log('Loading store NG pharmacists...');
        const { data: storeNgData, error: storeNgError } = await storeNgPharmacists.getStoreNgPharmacists(user.id);
        if (storeNgError) {
          console.error('Error loading store NG pharmacists:', {
            error: storeNgError,
            code: storeNgError.code,
            message: storeNgError.message,
            details: storeNgError.details,
            hint: storeNgError.hint
          });
          // エラーが発生しても空のデータで初期化
          setStoreNgLists({});
        } else {
          console.log('Store NG pharmacists loaded:', storeNgData);
          // データを店舗名ごとにグループ化
          const groupedData: {[storeName: string]: string[]} = {};
          if (storeNgData) {
            storeNgData.forEach((item: any) => {
              if (!groupedData[item.store_name]) {
                groupedData[item.store_name] = [];
              }
              groupedData[item.store_name].push(item.pharmacist_id);
            });
          }
          setStoreNgLists(groupedData);
          console.log('Grouped store NG data:', groupedData);
        }
        
        console.log('=== PROFILE DATA LOADED END ===');
      } else {
        console.log('Profile data load error:', profileError);
        console.log('Profile data:', profileData);
      }
      
      // シフトに関連する薬剤師のプロフィールを取得
      const allPharmacistIds = new Set<string>();
      
      // assignedDataから薬剤師IDを収集
      if (assignedData && assignedData.length > 0) {
        assignedData.forEach((shift: any) => {
          if (shift.pharmacist_id) {
            allPharmacistIds.add(shift.pharmacist_id);
          }
        });
      }
      
      // confirmedShiftsからも薬剤師IDを収集
      if (confirmedShifts && confirmedShifts.length > 0) {
        confirmedShifts.forEach((shift: any) => {
          if (shift.pharmacist_id) {
            allPharmacistIds.add(shift.pharmacist_id);
          }
        });
      }
      
      const pharmacistIds = Array.from(allPharmacistIds);
      console.log('All pharmacist IDs found:', pharmacistIds);
      
      if (pharmacistIds.length > 0) {
        console.log('Fetching pharmacist profiles for IDs:', pharmacistIds);
        
        const { data: pharmacistProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', pharmacistIds);
        
        if (profileError) {
          console.error('Error fetching pharmacist profiles:', profileError);
        } else {
          console.log('Fetched pharmacist profiles:', pharmacistProfiles);
        }
        
        if (pharmacistProfiles) {
          const profilesMap: any = {};
          pharmacistProfiles.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
            console.log(`Added profile for ${profile.id}:`, { name: profile.name, email: profile.email });
          });
          setUserProfiles(profilesMap);
          console.log('Updated userProfiles state:', profilesMap);
        }
      } else {
        console.log('No pharmacist IDs found in any shifts, skipping pharmacist profile fetch');
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


  // （上でfunction宣言したのでここは削除）

  const handleDateSelect = (day: number) => {
    if (!day) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 選択済み日付リストのトグル（追加/削除）
    if (selectedDates.includes(formattedDate)) {
      // 既に選択済みの場合は削除
      setSelectedDates(prev => prev.filter(date => date !== formattedDate));
    } else {
      // 未選択の場合は追加
      setSelectedDates(prev => [...prev, formattedDate]);
    }
    
    // 新しい日付の場合はフォームをリセット
    setTimeSlot('');
    setRequiredStaff(null);
    setMemo('');
    // 店舗名はリセットしない（ユーザーが選択した店舗名を保持）
  };

  const handleAddStoreName = () => {
    console.log('=== ADD STORE NAME START ===');
    const name = (newStoreName || '').trim();
    if (!name) return;
    if (storeNames.includes(name)) {
      console.log('Duplicate store name; skip');
      return;
    }
    setStoreNames([...storeNames, name]);
    setNewStoreName('');
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
      
      // より明示的にstore_namesを送信
      console.log('About to send update with store_names:', storeNames);
      console.log('store_names is array:', Array.isArray(storeNames));
      console.log('store_names JSON:', JSON.stringify(storeNames));
      
      // 店舗毎のNG薬剤師設定を保存
      console.log('Saving store NG pharmacists:', storeNgLists);
      const { error: storeNgError } = await storeNgPharmacists.updateStoreNgPharmacists(user.id, storeNgLists);
      if (storeNgError) {
        console.error('Error saving store NG pharmacists:', storeNgError);
        alert('店舗毎のNG薬剤師設定の保存に失敗しました');
        return;
      }
      
      // Railwayログでも確認（認証エラーを回避）
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'log',
            message: `[STORE_NAMES_DEBUG] About to send update with store_names`,
            data: {
              storeNames: storeNames,
              isArray: Array.isArray(storeNames),
              jsonString: JSON.stringify(storeNames)
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.warn('Failed to send debug log to Railway:', logError);
      }
      
      // 強制的にコンソールに表示（フィルターを回避）
      console.error('=== STORE NAMES DEBUG ===');
      console.error('storeNames:', storeNames);
      console.error('isArray:', Array.isArray(storeNames));
      console.error('JSON:', JSON.stringify(storeNames));
      
      
      const updatePayload = {
        name: profileName,
        ng_list: ngList,
        store_names: storeNames
      };
      
      console.log('Update payload:', updatePayload);
      console.log('Update payload JSON:', JSON.stringify(updatePayload));
      
      const { data: updateResult, error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select('*');
      
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
              result: updateResult,
              storeNamesSent: storeNames,
              updatePayload: updatePayload
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.warn('Failed to send result log to Railway:', logError);
      }
      
      // 直接テスト用のクエリを実行
      if (!error && updateResult && updateResult.length > 0) {
        console.log('Testing direct query to verify store_names...');
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_profiles')
          .select('id, name, store_names')
          .eq('id', user.id)
          .single();
        
        console.log('Verification query result:', { data: verifyData, error: verifyError });
        if (verifyData) {
          console.log('Current store_names in DB:', verifyData.store_names);
        }
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
          console.log('Updated store_names type:', typeof updateResult[0].store_names);
          console.log('Updated store_names length:', updateResult[0].store_names?.length);
        }
        
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

  // 店舗毎のNG薬剤師管理関数
  const addStoreNgPharmacist = () => {
    console.log('addStoreNgPharmacist called:', {
      selectedStoreForNg,
      selectedStoreNgPharmacistId,
      currentStoreNgLists: storeNgLists
    });
    
    if (selectedStoreForNg && selectedStoreNgPharmacistId) {
      const newStoreNgLists = {
        ...storeNgLists,
        [selectedStoreForNg]: [...(storeNgLists[selectedStoreForNg] || []), selectedStoreNgPharmacistId]
      };
      
      console.log('Updating storeNgLists:', {
        from: storeNgLists,
        to: newStoreNgLists
      });
      
      setStoreNgLists(newStoreNgLists);
      setSelectedStoreNgPharmacistId('');
      
      console.log('Store NG pharmacist added successfully');
    } else {
      console.log('Cannot add store NG pharmacist - missing data:', {
        hasStore: !!selectedStoreForNg,
        hasPharmacist: !!selectedStoreNgPharmacistId
      });
    }
  };

  const removeStoreNgPharmacist = (storeName: string, pharmacistId: string) => {
    setStoreNgLists(prev => ({
      ...prev,
      [storeName]: (prev[storeName] || []).filter(id => id !== pharmacistId)
    }));
  };

  const handlePost = async () => {
    console.log('=== handlePost START ===');
    console.log('handlePost called', { selectedDates, timeSlot, requiredStaff, memo });
    
    // バリデーション
    if (selectedDates.length === 0) {
      alert('募集日を選択してください');
      return;
    }
    if (!timeSlot) {
      alert('時間帯を選択してください');
      return;
    }
    if (!requiredStaff) {
      alert('必要人数を選択してください');
      return;
    }
    
    // 既存の募集があるかチェック（同日・同店舗名で判断）
    console.log('=== HANDLEPOST DEBUG ===');
    console.log('selectedDates:', selectedDates);
    console.log('singleStoreName:', singleStoreName);
    console.log('batchStoreNames:', batchStoreNames);
    console.log('myShifts:', myShifts);
    
    // 追加対象（バッチ指定があればそれ、無ければ単一選択）
    const targets = (batchStoreNames.length > 0 ? batchStoreNames : [singleStoreName])
      .map(n => (n || '').trim())
      .filter(n => n !== ''); // 空文字列を除外
    
    console.log('=== STORE NAME VALIDATION ===');
    console.log('singleStoreName:', singleStoreName);
    console.log('batchStoreNames:', batchStoreNames);
    console.log('targets after filtering:', targets);
    
    if (targets.length === 0) {
      console.log('No valid store names found');
      alert('店舗名を選択してください');
      return;
    }

    // 既存同日・同店舗の募集を検出（更新対象）と、新規作成対象を振り分け
    const updates: { id: string, storeName: string }[] = [];
    const creates: string[] = [];
    for (const name of targets) {
      const match = myShifts.find((s: any) => {
        if (!selectedDates.includes(s.date)) return false;
        const direct = (s.store_name || '').trim();
        let fromMemo = '';
        if (!direct && typeof s.memo === 'string') {
          const m = s.memo.match(/\[store:([^\]]+)\]/);
          if (m && m[1]) fromMemo = m[1];
        }
        const sStoreName = direct || fromMemo;
        // 両方空 or 完全一致を重複とみなす
        return (sStoreName === '' && name === '') || sStoreName === name;
      });
      if (match) {
        updates.push({ id: match.id, storeName: name });
      } else {
        creates.push(name);
      }
    }

    try {
      // 既存分の処理: 更新 or 削除 をユーザーに選択させる
      if (updates.length > 0) {
        const doUpdate = confirm(`同じ日付・店舗名の募集が${updates.length}件あります。これらを上書き更新しますか？\n（キャンセルを選ぶと削除の確認に進みます）`);
        if (doUpdate) {
          await Promise.all(
            updates.map(u =>
              shiftPostings.updatePosting(u.id, {
                date: selectedDates[0],
                store_name: u.storeName || null,
                time_slot: timeSlot,
                required_staff: requiredStaff,
                memo
              })
            )
          );
        } else {
          const doDelete = confirm(`${updates.length}件の既存募集を削除しますか？`);
          if (doDelete) {
            await Promise.all(
              updates.map(u =>
                supabase
                  .from('shift_postings')
                  .delete()
                  .eq('id', u.id)
              )
            );
          }
        }
      }

      // 新規作成分
      if (creates.length > 0) {
        const payload = selectedDates.flatMap(date => 
          creates.map((name) => ({
            pharmacy_id: user.id,
            date: date,
            store_name: name || null,
            time_slot: timeSlot,
            required_staff: requiredStaff,
            memo,
            status: 'open'
          }))
        );
        console.log('Creating postings:', payload);
        console.log('Store names being saved:', creates);
        const { error } = await shiftPostings.createPostings(payload);
        if (error) throw error;
      }

      // フォームをリセット（店舗名は保持）
      setSelectedDates([]);
      setTimeSlot('');
      setRequiredStaff(null);
      setMemo('');

      // 再読込（プロフィールは保持）
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (!myShiftsError) setMyShifts(myShiftsData || []);
    } catch (e) {
      console.error('Exception in handlePost:', e);
      console.error('Error details:', {
        selectedDates,
        timeSlot,
        requiredStaff,
        memo,
        targets,
        updates,
        creates
      });
      alert(`募集の登録/更新に失敗しました: ${(e as any).message || 'Unknown error'}`);
    }
  };

  // 同日・同店舗の既存募集を検索
  const findExistingPostingForCurrentSelection = () => {
    const targets = (batchStoreNames.length > 0 ? batchStoreNames : [singleStoreName])
      .map(n => (n || '').trim())
      .filter(n => n !== '');
    
    return myShifts.find((s: any) => {
      if (!selectedDates.includes(s.date)) return false;
      const direct = (s.store_name || '').trim();
      let fromMemo = '';
      if (!direct && typeof s.memo === 'string') {
        const m = s.memo.match(/\[store:([^\]]+)\]/);
        if (m && m[1]) fromMemo = m[1];
      }
      const sStoreName = direct || fromMemo;
      
      // 選択された店舗名のいずれかと一致するかチェック
      return targets.some(selectedStore => {
        if (sStoreName === '' && selectedStore === '') return true;
        return sStoreName === selectedStore;
      });
    });
  };

  const handleUpdateExisting = async (postingId: string) => {
    try {
      const targets = (batchStoreNames.length > 0 ? batchStoreNames : [singleStoreName])
        .map(n => (n || '').trim())
        .filter(n => n !== '');
      
      // 複数日付の場合は最初の日付を使用
      await shiftPostings.updatePosting(postingId, {
        date: selectedDates[0],
        store_name: targets[0] || null, // 最初の店舗名を使用
        time_slot: timeSlot,
        required_staff: requiredStaff,
        memo
      });
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (!myShiftsError) setMyShifts(myShiftsData || []);
    } catch (e) {
      console.error('Update existing posting failed:', e);
      alert('募集の更新に失敗しました');
    }
  };

  const handleDeleteExisting = async (postingId: string) => {
    try {
      const { error } = await supabase
        .from('shift_postings')
        .delete()
        .eq('id', postingId);
      if (error) throw error;
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (!myShiftsError) setMyShifts(myShiftsData || []);
    } catch (e) {
      console.error('Delete existing posting failed:', e);
      alert('募集の削除に失敗しました');
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
  console.log('Form state:', { selectedDates, timeSlot, requiredStaff, memo });
  console.log('Calendar data:', { myShifts: myShifts.length, confirmedShifts: confirmedShifts.length });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        {/* 左: カレンダー */}
      <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
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

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {getDaysInMonth(currentDate).map((day, idx) => (
            <div
              key={idx}
              className={`p-2 sm:p-3 text-center text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                day ? 'cursor-pointer' : 'bg-gray-50'
              } ${
                selectedDates.includes(`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
                  ? 'bg-blue-100 border-blue-300'
                  : ''
              }`}
              onClick={() => day && handleDateSelect(day)}
            >
              {day && (
                <>
                  <div className="font-medium">{day}</div>
                  {/* 確定済みシフト（緑色） */}
                  {(() => {
                    const dayConfirmedShifts = confirmedShifts.filter((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
                    if (dayConfirmedShifts.length > 0) {
                      return (
                        <div className="text-[9px] sm:text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0.5 mt-1 inline-block">
                          <span className="sm:hidden">確{dayConfirmedShifts.length}</span>
                          <span className="hidden sm:inline">確定{dayConfirmedShifts.length}件</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* 募集中シフト数（青色）を表示（確定シフトがない場合） */}
                  {/* シフトが確定済みの場合は募集パッチを非表示 */}
                  {!isSystemConfirmed && (() => {
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const hasConfirmed = confirmedShifts.some((s: any) => s.date === dateStr);
                    if (hasConfirmed) return null;
                    const count = myShifts.filter((s: any) => s.date === dateStr).length;
                    return count > 0 ? (
                      <div className="text-[9px] sm:text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 mt-1 inline-block">
                        <span className="sm:hidden">募{count}</span>
                        <span className="hidden sm:inline">募集 {count}件</span>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右: シフト募集フォーム */}
      <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow">
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <h2 className="text-xl font-semibold">
                {isSystemConfirmed ? '確定シフト詳細' : '薬剤師募集登録'}
              </h2>
            </div>
            <button
              onClick={() => setShowProfileEdit(!showProfileEdit)}
              className="text-sm text-blue-100 hover:text-white"
            >
              プロフィール編集
            </button>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            {isSystemConfirmed ? '確定されたシフトの詳細を確認できます' : '必要な薬剤師の募集条件を設定してください'}
          </p>
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
                
                {/* 薬局全体のNG薬剤師設定 */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">薬局全体</h4>
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

                {/* 店舗毎のNG薬剤師設定 */}
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">店舗毎</h4>
                  <div className="space-y-2 mb-2">
                    <select
                      value={selectedStoreForNg}
                      onChange={(e) => {
                        console.log('Store selection changed:', e.target.value);
                        setSelectedStoreForNg(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">店舗を選択</option>
                      {storeNames.map((storeName) => (
                        <option key={storeName} value={storeName}>{storeName}</option>
                      ))}
                    </select>
                    <div className="flex space-x-2">
                      <select
                        value={selectedStoreNgPharmacistId}
                        onChange={(e) => {
                          console.log('Pharmacist selection changed:', e.target.value);
                          setSelectedStoreNgPharmacistId(e.target.value);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">薬剤師を選択</option>
                        {allPharmacists.map((p) => (
                          <option key={p.id} value={p.id}>{p.name || p.email}</option>
                        ))}
                      </select>
                      <button onClick={addStoreNgPharmacist} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">追加</button>
                    </div>
                  </div>
                  
                  {/* 店舗毎のNG薬剤師リスト表示 */}
                  {Object.keys(storeNgLists).map(storeName => (
                    storeNgLists[storeName].length > 0 && (
                      <div key={storeName} className="mb-2">
                        <div className="text-xs font-medium text-gray-500 mb-1">{storeName}</div>
                        <div className="space-y-1">
                          {storeNgLists[storeName].map((id) => (
                            <div key={id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                              <span className="text-sm">{allPharmacists.find(p => p.id === id)?.name || id}</span>
                              <button onClick={() => removeStoreNgPharmacist(storeName, id)} className="text-red-600 hover:text-red-800 text-sm">削除</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
              <button
                onClick={handleProfileUpdate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                更新
              </button>
            </div>
          )}
          
          {/* 確定シフトの詳細表示 */}
          {isSystemConfirmed && selectedDates.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-3">確定シフト一覧</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(() => {
                  // ログインユーザー（薬局）の確定シフトのみを表示
                  const filteredShifts = confirmedShifts.filter((shift: any) => 
                    selectedDates.includes(shift.date) && shift.pharmacy_id === user?.id
                  );
                  console.log('Filtered confirmed shifts for display (pharmacy only):', {
                    selectedDates,
                    currentUserId: user?.id,
                    allConfirmedShifts: confirmedShifts,
                    filteredShifts,
                    userProfiles
                  });
                  return filteredShifts.length > 0;
                })() ? (
                  confirmedShifts
                    .filter((shift: any) => selectedDates.includes(shift.date) && shift.pharmacy_id === user?.id)
                    .map((shift: any, index: number) => {
                  const pharmacistProfile = userProfiles[shift.pharmacist_id];
                  
                  // デバッグ情報
                  console.log('Rendering confirmed shift:', {
                    shift_id: shift.id,
                    pharmacist_id: shift.pharmacist_id,
                    pharmacistProfile: pharmacistProfile,
                    userProfiles: userProfiles,
                    pharmacist_name: pharmacistProfile?.name || 'NOT FOUND',
                    pharmacist_email: pharmacistProfile?.email || 'NOT FOUND',
                    time_slot: shift.time_slot,
                    time_slot_type: typeof shift.time_slot,
                    date: shift.date,
                    store_name: shift.store_name,
                    memo: shift.memo
                  });
                  
                  // 店舗名を取得（memoから抽出または直接指定）
                  const getStoreName = (shift: any) => {
                    const direct = (shift.store_name || '').trim();
                    let fromMemo = '';
                    if (!direct && typeof shift.memo === 'string') {
                      const m = shift.memo.match(/\[store:([^\]]+)\]/);
                      if (m && m[1]) fromMemo = m[1];
                    }
                    
                    // デバッグ情報
                    console.log('Shift data for store name:', {
                      shift_id: shift.id,
                      date: shift.date,
                      store_name: shift.store_name,
                      memo: shift.memo,
                      direct: direct,
                      fromMemo: fromMemo,
                      result: direct || fromMemo || '（店舗名未設定）'
                    });
                    
                    // 店舗名が取得できない場合は、薬局名を表示
                    const fallbackName = pharmacistProfile?.name || '薬局名未設定';
                    return direct || fromMemo || fallbackName;
                  };
                  
                  const storeName = getStoreName(shift);
                  
                  // 対応する募集データを検索
                  const correspondingPosting = myShifts.find((posting: any) => 
                    posting.date === shift.date && 
                    posting.time_slot === shift.time_slot &&
                    posting.pharmacy_id === shift.pharmacy_id
                  );
                  
                  const requiredStaff = correspondingPosting?.required_staff || correspondingPosting?.required_people || 1;
                  
                  return (
                    <div key={index} className="bg-white p-3 rounded border border-green-200">
                      <div className="text-sm font-medium text-gray-800">
                        {new Date(shift.date).getMonth() + 1}月{new Date(shift.date).getDate()}日
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        店舗: {storeName}
                      </div>
                      <div className="text-xs text-gray-600">
                        時間: {(() => {
                          const timeSlot = shift.time_slot;
                          console.log('Time slot processing:', {
                            shift_id: shift.id,
                            time_slot: timeSlot,
                            time_slot_type: typeof timeSlot
                          });
                          
                          if (timeSlot === 'morning' || timeSlot === 'am') {
                            return '午前 (9:00-13:00)';
                          } else if (timeSlot === 'afternoon' || timeSlot === 'pm') {
                            return '午後 (13:00-18:00)';
                          } else if (timeSlot === 'full' || timeSlot === 'fullday') {
                            return '終日 (9:00-18:00)';
                          } else if (timeSlot === 'consult' || timeSlot === 'negotiable') {
                            return '要相談';
                          } else if (timeSlot === 'evening' || timeSlot === 'night') {
                            return '夜間';
                          } else {
                            console.warn('Unknown time_slot value:', timeSlot);
                            return `不明 (${timeSlot})`;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-gray-600">
                        薬剤師: {pharmacistProfile?.name || pharmacistProfile?.email || `薬剤師名未設定 (ID: ${shift.pharmacist_id})`}
                      </div>
                      {correspondingPosting && (
                        <div className="text-xs text-gray-500 mt-1 border-t pt-1">
                          募集: {requiredStaff}人 | 確定: {confirmedShifts.filter((s: any) => 
                            s.date === shift.date && 
                            s.time_slot === shift.time_slot &&
                            s.pharmacy_id === shift.pharmacy_id
                          ).length}人
                          {confirmedShifts.filter((s: any) => 
                            s.date === shift.date && 
                            s.time_slot === shift.time_slot &&
                            s.pharmacy_id === shift.pharmacy_id
                          ).length > requiredStaff && (
                            <span className="text-red-600 ml-2">⚠️ 過剰確定</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    選択した日付に確定シフトはありません
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 概要（当日の全店舗分を表示） */}
          <div className="p-3 bg-gray-100 rounded text-xs">
            <div className="font-medium text-gray-700 mb-1">選択日: {selectedDates.length > 0 ? selectedDates.join(', ') : '未選択'}</div>
            {selectedDates.length > 0 ? (
              <div className="space-y-1">
                {myShifts
                  .filter((s: any) => selectedDates.includes(s.date))
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
                        <div className="text-gray-800">店舗: {name && name.trim() !== '' ? name : '（店舗名未設定）'}</div>
                        <div className="text-gray-500">{s.time_slot === 'morning' ? '午前' : s.time_slot === 'afternoon' ? '午後' : s.time_slot === 'full' ? '終日' : s.time_slot === 'consult' ? '要相談' : s.time_slot} / {s.required_staff || 1}人</div>
                      </div>
                    );
                  })}
                {myShifts.filter((s: any) => selectedDates.includes(s.date)).length === 0 && (
                  <div className="text-gray-500">この日付の募集はありません</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">日付を選択してください</div>
            )}
            
            {/* 選択された日付の表示 */}
            {selectedDates.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded">
                <div className="text-xs font-medium text-blue-800 mb-1">
                  選択された日付 ({selectedDates.length}件)
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedDates.map(date => (
                    <span key={date} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {new Date(date).getMonth() + 1}月{new Date(date).getDate()}日
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 募集日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集日</label>
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
                const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                
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

          {/* 店舗名選択（一時保存可・単一選択） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
            <select
              value={singleStoreName}
              onChange={(e) => setSingleStoreName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">店舗名を選択してください</option>
              {storeOptions.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
            {/* 選択した店舗を一時リストに追加 → 複数店舗をまとめて登録 */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  const name = (singleStoreName || '').trim();
                  if (name === '') return; // 空文字列はスキップ
                  if (!batchStoreNames.includes(name)) {
                    const next = [...batchStoreNames, name];
                    setBatchStoreNames(next);
                  }
                }}
                className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >リストに追加</button>
            </div>
            {batchStoreNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {batchStoreNames.map((n, i) => (
                  <span key={`${n}-${i}`} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {n && n.trim() !== '' ? n : '（店舗名なし）'}
                    <button
                      type="button"
                      onClick={() => setBatchStoreNames(batchStoreNames.filter((_, idx) => idx !== i))}
                      className="text-blue-600 hover:text-blue-800"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            {/* quick add removed */}
          </div>

          {/* 時間帯 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集時間帯</label>
            <div className="grid grid-cols-2 gap-2">
                              {[{id:'morning',label:'午前 (9:00-13:00)',icon:Sun,color:'bg-green-500 hover:bg-green-600'},
                {id:'afternoon',label:'午後 (13:00-18:00)',icon:Sun,color:'bg-orange-500 hover:bg-orange-600'},
                {id:'full',label:'終日 (9:00-18:00)',icon:Users,color:'bg-yellow-500 hover:bg-yellow-600'}].map(slot=>{
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
          {selectedDates.length > 0 && confirmedShifts.some((s: any) => selectedDates.includes(s.date)) ? (
            <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium">
              確定済みのため編集できません
            </div>
          ) : (
            <div>
            <button 
              type="button"
              onClick={() => {
                console.log('=== BUTTON CLICK START ===');
                console.log('Form state:', { selectedDates, timeSlot, requiredStaff, memo });
                
                if (isSystemConfirmed) {
                  alert('シフト確定済みのため編集できません');
                  return;
                }
                if (selectedDates.length === 0 || !timeSlot || !requiredStaff) {
                  alert('募集日・時間帯・人数を選択してください');
                  return;
                }
                
                console.log('Validation passed, calling handlePost');
                handlePost();
              }}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
                isSystemConfirmed ? 'bg-gray-400 text-white cursor-not-allowed' :
                findExistingPostingForCurrentSelection() ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              disabled={isSystemConfirmed}
            >
              {(() => {
                if (isSystemConfirmed) return 'シフト確定済み';
                const existing = findExistingPostingForCurrentSelection();
                if (!existing) return '募集を追加';
                return '募集を更新';
              })()}
            </button>
            {(() => {
              const existing = findExistingPostingForCurrentSelection();
              if (!existing) return null;
              return (
                <button
                  type="button"
                  onClick={() => handleDeleteExisting(existing.id)}
                  className="mt-2 w-full py-2 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  募集を削除
                </button>
              );
            })()}
            </div>
          )}
        </div>

        {/* 注意ボックス */}
        <div className="px-4 lg:px-6 pb-4 lg:pb-6">
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>月初に必要人数を全ての日程へ一括登録することをお勧めします</li>
              <li>「終日」は選択すると募集要件を明確にしてください</li>
              <li>NG薬剤師の設定は別途管理画面で行えます</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
