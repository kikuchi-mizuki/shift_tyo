import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Sun, MessageCircle, Smile } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, systemStatus, supabase, storeNgPharmacies } from '../lib/supabase';

interface PharmacistDashboardProps {
  user: any;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [customTimeMode, setCustomTimeMode] = useState(false); // カスタム時間入力モード
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
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

  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  // NG設定関連のUIは管理画面のみ。値の読み込みは残すが、編集UIは表示しない。
  const [ngList, setNgList] = useState<string[]>([]);
  const [storeNgLists, setStoreNgLists] = useState<{[pharmacyId: string]: {[storeName: string]: boolean}}>({});
  // NG設定UI用の変数（非表示だが参照エラー回避のため残す）
  const [selectedPharmacyForNg, setSelectedPharmacyForNg] = useState('');
  const [selectedStoreForNg, setSelectedStoreForNg] = useState('');
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [selectedNgPharmacyId, setSelectedNgPharmacyId] = useState('');

  // 画面内デバッグ表示切替（?debug=1）
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';


  useEffect(() => {
    // 常時可視ログ（error レベル）
    try {
      console.error('[PD] PharmacistDashboard mounted', { userId: user?.id });
    } catch {}
    loadShifts();
  }, [user]);

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
      
      // 認証状態の確認（デバッグ用）
      if (authUser) {
        console.log(`認証ユーザーID: ${authUser.id}\n現在のユーザーID: ${user.id}\n一致: ${authUser.id === user.id ? 'はい' : 'いいえ'}`);
      } else {
        console.log('認証ユーザーが取得できません');
      }
      
      // まず全てのassigned_shiftsを取得してデバッグ
      const { data: allAssignedData, error: allAssignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      console.log('All assigned shifts:', allAssignedData);
      console.log('All assigned shifts error:', allAssignedError);
      
      // assigned_shiftsテーブルの状態確認（デバッグ用）
      if (allAssignedData && allAssignedData.length > 0) {
        console.log(`assigned_shiftsテーブルに${allAssignedData.length}件のデータがあります\n現在のユーザーID: ${user.id}\nテーブル内のpharmacist_id: ${allAssignedData.map((s: any) => s.pharmacist_id).slice(0, 3).join(', ')}...`);
      } else {
        console.log('assigned_shiftsテーブルにデータがありません');
      }
      
      // 認証ユーザーIDを使用してシフトを取得
      const userIdToUse = authUser?.id || user.id;
      console.log('Attempting to load assigned shifts for pharmacist_id:', userIdToUse);
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('pharmacist_id', userIdToUse)
        .eq('status', 'confirmed');
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', {
          error: assignedError,
          code: assignedError.code,
          message: assignedError.message,
          details: assignedError.details,
          hint: assignedError.hint,
          pharmacist_id: userIdToUse
        });
        
        // RLSポリシーの問題の可能性があるため、代替手段を試行
        console.log('Trying alternative query without status filter...');
        const { data: altData, error: altError } = await supabase
          .from('assigned_shifts')
          .select('*')
          .eq('pharmacist_id', userIdToUse);
        
        if (altError) {
          console.error('Alternative query also failed:', altError);
          setMyShifts([]);
        } else {
          console.log('Alternative query succeeded:', altData);
          // statusでフィルタリング
          const confirmedData = altData?.filter((shift: any) => shift.status === 'confirmed') || [];
          setMyShifts(confirmedData);
        }
      } else {
        console.log('Loaded assigned shifts:', assignedData);
        try {
          console.error('[PD] Loaded assigned_shifts', {
            count: assignedData?.length || 0,
            ids: (assignedData || []).map((s: any) => s.id).slice(0, 10),
          });
        } catch {}
        console.log('My shifts count:', assignedData?.length || 0);
        if (assignedData && assignedData.length > 0) {
          console.log('My shifts details:', assignedData.map((s: any) => ({ date: s.date, status: s.status, pharmacy_id: s.pharmacy_id })));
          console.log('Pharmacist shifts store_name analysis:', assignedData.map((shift: any) => ({
            id: shift.id,
            date: shift.date,
            store_name: shift.store_name,
            memo: shift.memo,
            has_store_name: !!shift.store_name,
            has_memo: !!shift.memo
          })));
          console.log(`あなたの確定シフト: ${assignedData.length}件\n日付: ${assignedData.map((s: any) => s.date).join(', ')}`);
        } else {
          console.log('あなたの確定シフトは0件です');
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
      
      // 店舗毎NG薬局設定を読み込み
      const { data: storeNgData, error: storeNgError } = await storeNgPharmacies.getStoreNgPharmacies(userIdToUse);
      if (storeNgError) {
        console.error('Error loading store NG pharmacies:', {
          error: storeNgError,
          code: storeNgError.code,
          message: storeNgError.message,
          details: storeNgError.details,
          hint: storeNgError.hint
        });
        // エラーが発生しても空のデータで初期化
        setStoreNgLists({});
      } else if (storeNgData) {
        console.log('Store NG pharmacies loaded:', storeNgData);
        // データをグループ化
        const groupedData: {[pharmacyId: string]: {[storeName: string]: boolean}} = {};
        storeNgData.forEach((item: any) => {
          if (!groupedData[item.pharmacy_id]) {
            groupedData[item.pharmacy_id] = {};
          }
          groupedData[item.pharmacy_id][item.store_name] = true;
        });
        setStoreNgLists(groupedData);
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
          .select('id,name,email,store_names')
          .eq('user_type', 'pharmacy');
        setAllPharmacies(data || []);
      } catch {}
    })();
  }, []);

  // 選択された薬局の店舗名リストを取得
  useEffect(() => {
    if (selectedPharmacyForNg) {
      const pharmacy = allPharmacies.find(p => p.id === selectedPharmacyForNg);
      if (pharmacy && pharmacy.store_names && Array.isArray(pharmacy.store_names)) {
        setAvailableStores(pharmacy.store_names);
      } else {
        setAvailableStores([]);
      }
      setSelectedStoreForNg(''); // 薬局が変更されたら店舗選択をリセット
    } else {
      setAvailableStores([]);
      setSelectedStoreForNg('');
    }
  }, [selectedPharmacyForNg, allPharmacies]);

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
        setCustomTimeMode(false);
        setStartTime('09:00');
        setEndTime('13:00');
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
        
        // 店舗毎NG薬局設定を保存
        const { error: storeNgError } = await storeNgPharmacies.updateStoreNgPharmacies(userIdToUse, storeNgLists);
        if (storeNgError) {
          console.error('Error updating store NG pharmacies:', storeNgError);
          alert('店舗毎NG薬局設定の保存に失敗しました');
        }
        
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

  // 店舗毎のNG薬局管理関数
  const addStoreNgPharmacy = async () => {
    if (selectedPharmacyForNg && selectedStoreForNg) {
      const newStoreNgLists = {
        ...storeNgLists,
        [selectedPharmacyForNg]: {
          ...(storeNgLists[selectedPharmacyForNg] || {}),
          [selectedStoreForNg]: true
        }
      };
      
      setStoreNgLists(newStoreNgLists);
      setSelectedStoreForNg('');
      
      // 即座にデータベースに保存
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        const userIdToUse = authUser?.id || user.id;
        
        if (!userIdToUse) {
          console.error('User ID is missing!');
          alert('ユーザーIDが取得できません。ログインし直してください。');
          return;
        }
        
        console.log('Saving store NG pharmacy to database:', { pharmacyId: selectedPharmacyForNg, storeName: selectedStoreForNg });
        const { error: storeNgError } = await storeNgPharmacies.updateStoreNgPharmacies(userIdToUse, newStoreNgLists);
        
        if (storeNgError) {
          console.error('Error saving store NG pharmacy:', storeNgError);
          alert('店舗毎NG薬局設定の保存に失敗しました');
          // エラーの場合は状態を元に戻す
          setStoreNgLists(storeNgLists);
        } else {
          console.log('Store NG pharmacy saved successfully');
        }
      } catch (error) {
        console.error('Error in addStoreNgPharmacy:', error);
        alert('店舗毎NG薬局設定の保存に失敗しました');
        // エラーの場合は状態を元に戻す
        setStoreNgLists(storeNgLists);
      }
    }
  };

  const removeStoreNgPharmacy = async (pharmacyId: string, storeName: string) => {
    const newStoreNgLists = {
      ...storeNgLists,
      [pharmacyId]: {
        ...storeNgLists[pharmacyId],
        [storeName]: false
      }
    };
    
    setStoreNgLists(newStoreNgLists);
    
    // 即座にデータベースに保存
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;
      
      if (!userIdToUse) {
        console.error('User ID is missing!');
        alert('ユーザーIDが取得できません。ログインし直してください。');
        return;
      }
      
      console.log('Removing store NG pharmacy from database:', { pharmacyId, storeName });
      const { error: storeNgError } = await storeNgPharmacies.updateStoreNgPharmacies(userIdToUse, newStoreNgLists);
      
      if (storeNgError) {
        console.error('Error removing store NG pharmacy:', storeNgError);
        alert('店舗毎NG薬局設定の削除に失敗しました');
        // エラーの場合は状態を元に戻す
        setStoreNgLists(storeNgLists);
      } else {
        console.log('Store NG pharmacy removed successfully');
      }
    } catch (error) {
      console.error('Error in removeStoreNgPharmacy:', error);
      alert('店舗毎NG薬局設定の削除に失敗しました');
      // エラーの場合は状態を元に戻す
      setStoreNgLists(storeNgLists);
    }
  };

  const updateNgListInDatabase = async (newNgList: string[]) => {
    try {
      console.log('=== UPDATING NG LIST IN DATABASE ===');
      console.log('User ID:', user.id);
      console.log('New NG list:', newNgList);
      
      // 認証ユーザーIDを取得
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;
      
      // ユーザーIDの確認
      if (!userIdToUse) {
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
    
    if (selectedDates.length === 0 || (!customTimeMode && !selectedTimeSlot)) {
      alert('日付と時間帯を選択してください');
      return;
    }
    if (customTimeMode && (!startTime || !endTime)) {
      alert('開始時間と終了時間を入力してください');
      return;
    }
    if (customTimeMode && startTime >= endTime) {
      alert('開始時間は終了時間より早く設定してください');
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
        time_slot: customTimeMode ? 'custom' : selectedTimeSlot,
        start_time: customTimeMode ? startTime + ':00' : undefined,
        end_time: customTimeMode ? endTime + ':00' : undefined,
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

  // 既存の希望を削除する関数
  const handleDeleteExistingRequests = async () => {
    if (selectedDates.length === 0) {
      alert('削除する日付を選択してください');
      return;
    }

    try {
      // 認証ユーザーIDを取得
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;

      // 選択された日付の既存の希望を取得
      const existingRequests = myRequests.filter((req: any) => 
        selectedDates.includes(req.date) && req.pharmacist_id === userIdToUse
      );

      if (existingRequests.length === 0) {
        alert('削除する希望が見つかりません');
        return;
      }

      // 削除確認
      const confirmMessage = `${existingRequests.length}件の希望を削除しますか？\n日付: ${existingRequests.map((r: any) => r.date).join(', ')}`;
      if (!confirm(confirmMessage)) {
        return;
      }

      // 各希望を削除
      const deletePromises = existingRequests.map((req: any) =>
        supabase.from('shift_requests').delete().eq('id', req.id)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error('Error deleting shift requests:', errors);
        alert(`シフト希望の削除に失敗しました: ${errors[0].error?.message || 'Unknown error'}`);
      } else {
        console.log('Shift requests deleted successfully');
        setSelectedDates([]);
        setSelectedTimeSlot('');
        setMemo('');
        loadShifts();
      }
    } catch (error) {
      console.error('Error deleting shift requests:', error);
      alert('シフト希望の削除に失敗しました');
    }
  };

  const timeSlots = [
    { id: 'morning', label: '午前 (9:00-13:00)', icon: Sun, color: 'bg-green-500 hover:bg-green-600' },
    { id: 'afternoon', label: '午後 (13:00-18:00)', icon: Sun, color: 'bg-orange-500 hover:bg-orange-600' },
    { id: 'full', label: '終日 (9:00-18:00)', icon: Smile, color: 'bg-yellow-500 hover:bg-yellow-600' }
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
    return myShifts.some((s: any) => s.date === dateStr);
  };

  return (
    <div className="space-y-6">
      {isDebug && (
        <div className="fixed right-2 top-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded">
          <div>PD debug</div>
          <div>user: {user?.id || 'N/A'}</div>
          <div>confirmed: {myShifts?.length || 0}</div>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        {/* 左側: カレンダー */}
                  <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
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

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {getDaysInMonth(currentDate).map((day, index) => (
              <div
                key={index}
                className={`p-2 sm:p-3 text-center text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                  day ? 'cursor-pointer' : 'bg-gray-50'
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
                      <div className="text-[9px] sm:text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0.5 mt-1 inline-block">
                        <span className="sm:hidden">確</span>
                        <span className="hidden sm:inline">確定</span>
                      </div>
                    )}
                    {/* 確定シフトがない場合のみ希望バッジを表示（要相談は「相談」パッチ） */}
                    {/* シフトが確定済みの場合は希望・相談パッチを非表示 */}
                    {!isSystemConfirmed && !hasMyShift(day) && hasMyRequest(day) && (() => {
                      const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                      const dayReqs = myRequests.filter((r: any) => r.date === dateStr);
                      const hasConsult = dayReqs.some((r: any) => r.time_slot === 'consult' || r.time_slot === 'negotiable');
                      return hasConsult ? (
                        <div className="text-[9px] sm:text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5 mt-1 inline-block">
                          <span className="sm:hidden">相</span>
                          <span className="hidden sm:inline">相談</span>
                        </div>
                      ) : (
                        <div className="text-[9px] sm:text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 mt-1 inline-block">
                          <span className="sm:hidden">希</span>
                          <span className="hidden sm:inline">希望</span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右側: シフト希望登録フォーム */}
        <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow">
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


              </div>
            )}
            
            {/* 確定シフトの詳細表示 */}
            {isSystemConfirmed && selectedDates.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-3">確定シフト一覧</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myShifts
                    .filter((shift: any) => selectedDates.includes(shift.date))
                    .length > 0 ? (
                    myShifts
                      .filter((shift: any) => selectedDates.includes(shift.date))
                      .map((shift: any, index: number) => {
                    const pharmacyProfile = userProfiles[shift.pharmacy_id];
                    
                    // デバッグ情報
                    console.log('🔍 薬剤師シフトの薬局プロフィール確認:', {
                      shift_id: shift.id,
                      pharmacy_id: shift.pharmacy_id,
                      pharmacyProfile: pharmacyProfile,
                      userProfiles: userProfiles,
                      pharmacy_name: pharmacyProfile?.name || 'NOT FOUND'
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
                      console.log('Pharmacist shift data for store name:', {
                        shift_id: shift.id,
                        date: shift.date,
                        store_name: shift.store_name,
                        memo: shift.memo,
                        direct: direct,
                        fromMemo: fromMemo,
                        result: direct || fromMemo || '（店舗名未設定）'
                      });
                      
                      // 店舗名が取得できない場合は、薬局名を表示
                      const fallbackName = pharmacyProfile?.name || '薬局名未設定';
                      return direct || fromMemo || fallbackName;
                    };
                    
                    const storeName = getStoreName(shift);
                    
                    return (
                      <div key={index} className="bg-white p-3 rounded border border-green-200">
                        <div className="text-sm font-medium text-gray-800">
                          {new Date(shift.date).getMonth() + 1}月{new Date(shift.date).getDate()}日
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          薬局: {pharmacyProfile?.name || pharmacyProfile?.email || '薬局名未設定'}
                        </div>
                        <div className="text-xs text-gray-600">
                          店舗: {storeName}
                        </div>
                        <div className="text-xs text-gray-600">
                          時間: {shift.time_slot === 'morning' || shift.time_slot === 'am' ? '午前 (9:00-13:00)' :
                                shift.time_slot === 'afternoon' || shift.time_slot === 'pm' ? '午後 (13:00-18:00)' :
                                shift.time_slot === 'full' ? '終日 (9:00-18:00)' :
                                shift.time_slot === 'consult' ? '要相談' : '夜間'}
                        </div>
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
              
              {/* 時間帯選択モード切り替え */}
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={() => setCustomTimeMode(false)}
                    className={`w-full px-3 py-2 rounded text-sm ${!customTimeMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    定型時間
                  </button>
                  <button
                    onClick={() => setCustomTimeMode(true)}
                    className={`w-full px-3 py-2 rounded text-sm ${customTimeMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    時間を選択
                  </button>
                </div>
              </div>

              {!customTimeMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`w-full flex items-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${
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
              ) : (
                <div className="space-y-3 w-full min-w-0 overflow-x-hidden">
                  <div className="grid grid-cols-2 gap-2 w-full min-w-0 overflow-hidden">
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-medium text-gray-600 mb-1">開始時間</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full max-w-full min-w-0 box-border px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      />
                    </div>
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-medium text-gray-600 mb-1">終了時間</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full max-w-full min-w-0 box-border px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    選択時間: {startTime} - {endTime}
                  </div>
                </div>
              )}
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
            ) : (() => {
              // 選択された日付に既存の希望があるかチェック
              const hasExistingRequests = selectedDates.some(date => 
                myRequests.some((req: any) => req.date === date)
              );
              
              if (hasExistingRequests) {
                // 既存の希望がある場合は「希望を更新」と「希望を削除」の両方を表示
                return (
                  <div className="space-y-2">
                    <button
                      onClick={handleSubmit}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700"
                    >
                      希望を更新
                    </button>
                    <button
                      onClick={handleDeleteExistingRequests}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
                    >
                      希望を削除
                    </button>
                  </div>
                );
              } else {
                // 既存の希望がない場合は「希望を追加」のみ表示
                return (
                  <button
                    onClick={handleSubmit}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                  >
                    希望を追加
                  </button>
                );
              }
            })()}

            {/* 情報ボックス */}
            {/* 管理画面のみ許可: NG設定UIは非表示（この情報ブロックはそのまま） */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                シフト希望登録のポイント
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 希望日は月初に一括登録することをお勧めします</li>
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
