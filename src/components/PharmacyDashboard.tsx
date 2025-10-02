import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Sun, Users, Star } from 'lucide-react';
import { shifts, shiftPostings, systemStatus, storeNgPharmacists, supabase, pharmacistRatings } from '../lib/supabase';

// デバッグ: インポートの確認
console.log('PharmacyDashboard imports:', { shifts, shiftPostings });

interface PharmacyDashboardProps {
  user: any;
}

const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning'); // デフォルトで午前を選択
  const [customTimeMode, setCustomTimeMode] = useState(false); // カスタム時間入力モード
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [requiredStaff, setRequiredStaff] = useState<number | null>(1); // デフォルトで1人を選択
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [nearestStationName, setNearestStationName] = useState('');
  const [storeNames, setStoreNames] = useState<string[]>([]);
  
  // 店舗毎の最寄駅設定用のstate
  const [storeStations, setStoreStations] = useState<{[storeName: string]: {
    nearest_station_name: string;
  }}>({});
  const [editingStoreStation, setEditingStoreStation] = useState<string | null>(null);
  // 募集登録での店舗名は一時保存は残しつつ単一選択へ
  const [singleStoreName, setSingleStoreName] = useState('');
  const [batchStoreNames, setBatchStoreNames] = useState<string[]>([]); // 追加リスト
  const [isSystemConfirmed, setIsSystemConfirmed] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(true);
  // quick add input removed per request

  // 日付をリストに追加する関数
  const addDateToList = () => {
    if (tempSelectedDate && !selectedDates.includes(tempSelectedDate)) {
      console.log('=== ADDING DATE TO LIST ===');
      console.log('tempSelectedDate:', tempSelectedDate);
      console.log('current selectedDates:', selectedDates);
      setSelectedDates(prev => {
        const newDates = [...prev, tempSelectedDate];
        console.log('new selectedDates:', newDates);
        return newDates;
      });
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
  
  // 評価関連のstate
  const [ratings, setRatings] = useState<any[]>([]);
  const [editingRating, setEditingRating] = useState<string | null>(null);
  const [ratingForm, setRatingForm] = useState<{
    rating: number;
    comment: string;
  }>({ rating: 5, comment: '' });
  const [selectedNgPharmacistId, setSelectedNgPharmacistId] = useState(''); // 薬局全体用
  const [storeNgLists, setStoreNgLists] = useState<{[storeName: string]: string[]}>({}); // 店舗毎のNG薬剤師ID
  const [selectedStoreForNg, setSelectedStoreForNg] = useState('');
  const [selectedStoreNgPharmacistId, setSelectedStoreNgPharmacistId] = useState(''); // 店舗毎用
  const [allPharmacists, setAllPharmacists] = useState<any[]>([]);

  // 画面内デバッグ表示切替（?debug=1）
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  useEffect(() => {
    console.log('PharmacyDashboard mounted, user:', user);
    try {
      console.error('[PH] PharmacyDashboard mounted', { userId: user?.id });
    } catch {}
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
    checkRecruitmentStatus();
  }, [user]);

  // 募集状況をチェックする関数
  const checkRecruitmentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('recruitment_status')
        .select('is_open')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (error) {
        console.error('募集状況チェックエラー:', error);
        return;
      }
      
      if (data) {
        setIsRecruitmentOpen(data.is_open);
      }
    } catch (error) {
      console.error('募集状況チェックエラー:', error);
    }
  };

  // タブフォーカス/定期ポーリングで最新化
  useEffect(() => {
    const onFocus = () => {
      checkRecruitmentStatus();
    };
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(checkRecruitmentStatus, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, []);

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
      console.log('=== LOADING SYSTEM STATUS ===');
      const { data: systemStatusData, error: systemStatusError } = await systemStatus.getSystemStatus();
      console.log('System status data:', systemStatusData);
      console.log('System status error:', systemStatusError);
      if (!systemStatusError && systemStatusData) {
        const isConfirmed = systemStatusData.status === 'confirmed';
        console.log('Setting isSystemConfirmed to:', isConfirmed);
        setIsSystemConfirmed(isConfirmed);
      } else {
        console.log('System status not loaded, defaulting to false');
        setIsSystemConfirmed(false);
      }
      
      // 募集シフトを取得
      console.log('Calling shiftPostings.getPostings...');
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (myShiftsError) {
        console.error('Error loading shift postings:', myShiftsError);
        setMyShifts([]);
      } else {
        console.log('=== SHIFT POSTINGS LOADED ===');
        console.log('Raw myShiftsData:', myShiftsData);
        console.log('myShiftsData type:', typeof myShiftsData);
        console.log('myShiftsData length:', myShiftsData?.length || 0);
        
        // 9月1日のデータを特別にチェック
        const sept1Data = myShiftsData?.filter((posting: any) => posting.date === '2025-09-01');
        console.log('=== SEPTEMBER 1st DATA CHECK ===');
        console.log('September 1st postings:', sept1Data);
        console.log('September 1st count:', sept1Data?.length || 0);
        
        console.log('Shift postings detailed analysis:', myShiftsData?.map((posting: any) => ({
          id: posting.id,
          date: posting.date,
          time_slot: posting.time_slot,
          required_staff: posting.required_staff,
          required_people: posting.required_people,
          store_name: posting.store_name,
          memo: posting.memo,
          status: posting.status,
          pharmacy_id: posting.pharmacy_id,
          created_at: posting.created_at,
          updated_at: posting.updated_at
        })));
        
        // 重複チェック: 同じ日付・店舗・時間帯の募集がないか確認
        const duplicates = new Map();
        const duplicateCheck = (myShiftsData || []).forEach((posting: any) => {
          const key = `${posting.date}_${posting.store_name}_${posting.time_slot}`;
          if (duplicates.has(key)) {
            console.warn(`重複募集を発見:`, {
              key,
              existing: duplicates.get(key),
              duplicate: posting
            });
          } else {
            duplicates.set(key, posting);
          }
        });
        
        // 確定済みステータスの募集を除外
        const filteredPostings = (myShiftsData || []).filter((posting: any) => {
          return posting.status !== 'confirmed';
        });
        
        console.log(`薬局ダッシュボード: 全募集${myShiftsData?.length || 0}件 → 表示${filteredPostings.length}件`);
        console.log('フィルタ後の募集詳細:', filteredPostings.map(p => ({
          id: p.id,
          date: p.date,
          store_name: p.store_name,
          time_slot: p.time_slot,
          status: p.status
        })));
        setMyShifts(filteredPostings);
      }
      
      // 直接Supabaseから確定済みシフトを取得
      console.log('=== LOADING CONFIRMED SHIFTS ===');
      console.log('Attempting to load assigned shifts for pharmacy_id:', user.id);
      console.log('User object:', user);
      console.log('Supabase client status:', {
        url: supabase.supabaseUrl,
        hasAuth: !!supabase.auth,
        currentUser: await supabase.auth.getUser()
      });
      
      // 認証ユーザーIDを取得
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const userIdToUse = authUser?.id || user.id;
      
      console.log('=== AUTH USER CHECK ===');
      console.log('authUser:', authUser);
      console.log('user.id:', user.id);
      console.log('userIdToUse:', userIdToUse);
      
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*, start_time, end_time')
        .eq('pharmacy_id', userIdToUse)
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
          .select('*, start_time, end_time')
          .eq('pharmacy_id', userIdToUse);
        
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
        try {
          console.error('[PH] Loaded assigned_shifts', {
            count: assignedData?.length || 0,
            ids: (assignedData || []).map((s: any) => s.id).slice(0, 10),
          });
        } catch {}
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

        // 評価データを取得
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userIdToUse = authUser?.id || user?.id;
        if (userIdToUse) {
          const { data: ratingsData } = await pharmacistRatings.getRatings({
            pharmacy_id: userIdToUse
          });
          if (ratingsData) {
            setRatings(ratingsData);
          }
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
    
    console.log('=== DATE SELECT DEBUG ===');
    console.log('Clicked day:', day);
    console.log('formattedDate:', formattedDate);
    console.log('current selectedDates:', selectedDates);
    console.log('current timeSlot:', timeSlot);
    console.log('current customTimeMode:', customTimeMode);
    
    // 選択済み日付リストのトグル（追加/削除）
    if (selectedDates.includes(formattedDate)) {
      // 既に選択済みの場合は削除
      console.log('Removing date from selection');
      setSelectedDates(prev => prev.filter(date => date !== formattedDate));
    } else {
      // 未選択の場合は追加
      console.log('Adding date to selection');
      setSelectedDates(prev => {
        const newDates = [...prev, formattedDate];
        console.log('New selectedDates:', newDates);
        return newDates;
      });
      
      // 新しい日付の場合はフォームをリセット（ただし時間帯はデフォルト値を設定）
      console.log('Resetting form for new date');
      setTimeSlot('morning'); // 空文字列ではなくデフォルト値を設定
      setCustomTimeMode(false);
      setStartTime('09:00');
      setEndTime('13:00');
      setRequiredStaff(1); // nullではなくデフォルト値を設定
      setMemo('');
      // 店舗名はリセットしない（ユーザーが選択した店舗名を保持）
    }
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
    // 店舗を削除する際は、その店舗の最寄駅設定も削除
    const newStoreStations = { ...storeStations };
    delete newStoreStations[storeNameToRemove];
    setStoreStations(newStoreStations);
  };

  // 店舗毎の最寄駅設定を更新
  const handleStoreStationUpdate = (storeName: string, stationName: string) => {
    setStoreStations(prev => ({
      ...prev,
      [storeName]: {
        nearest_station_name: stationName
      }
    }));
  };

  // 店舗毎の最寄駅設定を保存
  const handleSaveStoreStations = async () => {
    try {
      console.log('=== SAVE STORE STATIONS START ===');
      console.log('Store stations to save:', storeStations);
      
      // 認証状態の詳細確認
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current authenticated user:', currentUser);
      console.log('Auth session:', await supabase.auth.getSession());
      
      if (!currentUser) {
        alert('認証されていません。再度ログインしてください。');
        return;
      }
      
      if (!supabase) {
        console.error('Supabase client is not available');
        return;
      }

      // 既存の店舗駅設定を削除
      const { error: deleteError } = await supabase
        .from('store_stations')
        .delete()
        .eq('pharmacy_id', user.id);

      if (deleteError) {
        console.error('Error deleting existing store stations:', deleteError);
        alert('既存の店舗駅設定の削除に失敗しました');
        return;
      }

      // 新しい店舗駅設定を追加
      const storeStationEntries = Object.entries(storeStations).map(([storeName, station]) => ({
        pharmacy_id: user.id,
        store_name: storeName,
        nearest_station_name: station.nearest_station_name
      }));

      if (storeStationEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('store_stations')
          .insert(storeStationEntries);

        if (insertError) {
          console.error('Error inserting store stations:', insertError);
          alert('店舗駅設定の保存に失敗しました');
          return;
        }
      }

      console.log('Store stations saved successfully');
      alert('店舗毎の最寄駅設定を保存しました');
      
    } catch (error) {
      console.error('Error saving store stations:', error);
      alert('店舗駅設定の保存に失敗しました');
    }
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
      
      // Railwayログは無効化（Edge Functionの400エラーを回避）
      console.log('Profile update log (disabled):', {
        userId: user.id,
        storeNames: storeNames,
        updateData: updateData
      });
      
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
      
      // Railwayログは無効化（Edge Functionの400エラーを回避）
      console.log('Store NG update log (disabled):', {
        userId: user.id,
        storeNgLists: storeNgLists
      });
      
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
      
      // 更新結果ログは無効化（Edge Functionの400エラーを回避）
      console.log('Profile update result log (disabled):', {
        userId: user.id,
        success: !error,
        error: error,
        result: updateResult,
        storeNamesSent: storeNames,
        updatePayload: updatePayload
      });
      
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
    console.log('handlePost called', { selectedDates, timeSlot, requiredStaff });
    
    // 募集締切チェック
    if (!isRecruitmentOpen) {
      alert('現在募集は締め切られています。管理者にお問い合わせください。');
      return;
    }
    
    // バリデーション
    if (selectedDates.length === 0) {
      alert('募集日を選択してください');
      return;
    }
    if (!customTimeMode && !timeSlot) {
      alert('時間帯を選択してください');
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

    // 既存同日・同店舗・同時間帯の募集を検出（更新対象）と、新規作成対象を振り分け
    const updates: { id: string, storeName: string }[] = [];
    const creates: string[] = [];
    
    console.log('=== 重複チェック開始 ===');
    console.log('targets:', targets);
    console.log('selectedDates:', selectedDates);
    console.log('timeSlot:', timeSlot);
    console.log('customTimeMode:', customTimeMode);
    
    for (const name of targets) {
      const match = myShifts.find((s: any) => {
        // 日付が一致するか
        if (!selectedDates.includes(s.date)) return false;
        
        // 同じ薬局の募集か
        if (s.pharmacy_id !== user?.id) return false;
        
        // 時間帯が一致するか（カスタム時間の場合はfulldayとして比較）
        const currentTimeSlot = customTimeMode ? 'fullday' : timeSlot;
        if (s.time_slot !== currentTimeSlot) return false;
        
        // 店舗名が一致するか
        const direct = (s.store_name || '').trim();
        let fromMemo = '';
        if (!direct && typeof s.memo === 'string') {
          const m = s.memo.match(/\[store:([^\]]+)\]/);
          if (m && m[1]) fromMemo = m[1];
        }
        const sStoreName = direct || fromMemo;
        return (sStoreName === '' && name === '') || sStoreName === name;
      });
      
      if (match) {
        console.log(`既存募集を発見: ${name} -> 更新対象`, match);
        updates.push({ id: match.id, storeName: name });
      } else {
        console.log(`新規募集: ${name} -> 作成対象`);
        creates.push(name);
      }
    }
    
    console.log(`更新対象: ${updates.length}件, 作成対象: ${creates.length}件`);

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
                // DBは 'custom' を許容しないため、カスタムは 'fullday' で保存
                time_slot: customTimeMode ? 'fullday' : timeSlot,
                start_time: customTimeMode ? startTime + ':00' : undefined,
                end_time: customTimeMode ? endTime + ':00' : undefined,
                required_staff: requiredStaff,
                memo: ''
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
            // カスタムは 'fullday' として保存し、start/end に実時間を保存
            time_slot: customTimeMode ? 'fullday' : timeSlot,
            start_time: customTimeMode ? startTime + ':00' : undefined,
            end_time: customTimeMode ? endTime + ':00' : undefined,
            required_staff: requiredStaff,
            memo: '',
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
      setCustomTimeMode(false);
      setStartTime('09:00');
      setEndTime('13:00');
      setRequiredStaff(null);
      setMemo('');

      // 再読込（プロフィールは保持）
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (!myShiftsError) {
        // 確定済みステータスの募集を除外
        const filteredPostings = (myShiftsData || []).filter((posting: any) => {
          return posting.status !== 'confirmed';
        });
        setMyShifts(filteredPostings);
      }
    } catch (e) {
      console.error('Exception in handlePost:', e);
      console.error('Error details:', {
        selectedDates,
        timeSlot,
        requiredStaff,
        targets,
        updates,
        creates
      });
      alert(`募集の登録/更新に失敗しました: ${(e as any).message || 'Unknown error'}`);
    }
  };

  // 同日・同店舗の既存募集を検索
  const findExistingPostingForCurrentSelection = () => {
    if (!selectedDates || selectedDates.length === 0) {
      console.log('No selected dates');
      return null;
    }
    
    if (!myShifts || myShifts.length === 0) {
      console.log('No myShifts data');
      return null;
    }
    
    const currentTimeSlot = customTimeMode ? 'custom' : timeSlot;
    
    console.log('=== findExistingPostingForCurrentSelection ===');
    console.log('selectedDates:', selectedDates);
    console.log('currentTimeSlot:', currentTimeSlot);
    console.log('user.id:', user?.id);
    console.log('myShifts count:', myShifts.length);
    
    // 選択された日付のいずれかに既存募集があるかチェック
    for (const selectedDate of selectedDates) {
      const existingPosting = myShifts.find((s: any) => {
        // 基本的な条件チェック
        if (!s || !s.date || !s.time_slot || !s.pharmacy_id) {
          return false;
        }
        
        // 日付が一致するか
        if (s.date !== selectedDate) {
          return false;
        }
        
        // 同じ薬局の募集か
        if (s.pharmacy_id !== user?.id) {
          return false;
        }
        
        // 時間帯が一致するか
        if (s.time_slot !== currentTimeSlot) {
          return false;
        }
        
        // カスタム時間の場合は時間範囲もチェック
        if (customTimeMode && currentTimeSlot === 'custom') {
          const sStartTime = s.start_time ? s.start_time.slice(0, 5) : '';
          const sEndTime = s.end_time ? s.end_time.slice(0, 5) : '';
          if (sStartTime !== startTime || sEndTime !== endTime) {
            return false;
          }
        }
        
        console.log('Found matching posting:', s);
        return true;
      });
      
      if (existingPosting) {
        console.log('Returning existing posting:', existingPosting);
        return existingPosting;
      }
    }
    
    console.log('No existing posting found');
    return null;
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
        time_slot: customTimeMode ? 'custom' : timeSlot,
        start_time: customTimeMode ? startTime + ':00' : undefined,
        end_time: customTimeMode ? endTime + ':00' : undefined,
        required_staff: requiredStaff,
        memo
      });
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (!myShiftsError) {
        // 確定済みステータスの募集を除外
        const filteredPostings = (myShiftsData || []).filter((posting: any) => {
          return posting.status !== 'confirmed';
        });
        setMyShifts(filteredPostings);
      }
    } catch (e) {
      console.error('Update existing posting failed:', e);
      alert('募集の更新に失敗しました');
    }
  };

  const handleDeleteExisting = async (postingId: string) => {
    try {
      console.log('=== handleDeleteExisting START ===');
      console.log('postingId:', postingId);
      console.log('user.id:', user?.id);
      
      if (!postingId) {
        throw new Error('Posting ID is required');
      }
      
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      
      console.log('Attempting to delete posting from shift_postings table');
      const { error } = await supabase
        .from('shift_postings')
        .delete()
        .eq('id', postingId)
        .eq('pharmacy_id', user.id); // 追加のセキュリティチェック
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Posting deleted successfully, refreshing data');
      const { data: myShiftsData, error: myShiftsError } = await shiftPostings.getPostings(user.id, 'pharmacy');
      if (myShiftsError) {
        console.error('Error refreshing data:', myShiftsError);
        throw myShiftsError;
      }
      
      // 確定済みステータスの募集を除外
      const filteredPostings = (myShiftsData || []).filter((posting: any) => {
        return posting.status !== 'confirmed';
      });
      setMyShifts(filteredPostings);
      console.log('Data refreshed successfully');
      alert('募集を削除しました');
      
    } catch (e) {
      console.error('=== handleDeleteExisting ERROR ===');
      console.error('Error details:', e);
      alert(`募集の削除に失敗しました: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
  console.log('Form state:', { selectedDates, timeSlot, requiredStaff });
  console.log('Calendar data:', { myShifts: myShifts.length, confirmedShifts: confirmedShifts.length });
  
  return (
    <div className="space-y-6">
      {isDebug && (
        <div className="fixed right-2 top-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded">
          <div>PH debug</div>
          <div>user: {user?.id || 'N/A'}</div>
          <div>confirmed: {confirmedShifts?.length || 0}</div>
        </div>
      )}
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
                  {/* 募集中シフト数（青色）を表示（募集締切でない限り） */}
                  {isRecruitmentOpen && (() => {
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
                薬剤師募集登録
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
            必要な薬剤師の募集条件を設定してください
          </p>
        </div>
        <div className="p-4 lg:p-6 space-y-6 pb-20">
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
              
              {/* 最寄駅設定 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">最寄駅の設定</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nearestStationName}
                    onChange={(e) => setNearestStationName(e.target.value)}
                    placeholder="最寄駅名（例：新宿駅）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
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
                        <div key={index} className="bg-white p-3 rounded border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{name}</span>
                            <button
                              onClick={() => handleRemoveStoreName(name)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              削除
                            </button>
                          </div>
                          
                          {/* 店舗毎の最寄駅設定 */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">最寄駅:</label>
                              <input
                                type="text"
                                value={storeStations[name]?.nearest_station_name || ''}
                                onChange={(e) => handleStoreStationUpdate(name, e.target.value)}
                                placeholder="最寄駅名（例：新宿駅）"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                        店舗名が登録されていません
                      </div>
                    )}
                  </div>
                  
                  {/* 店舗駅設定保存ボタン */}
                  {storeNames.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={handleSaveStoreStations}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        店舗毎の最寄駅設定を保存
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* 管理画面のみ許可: NG設定UIは非表示 */}
              {false && (
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
              )}
              <button
                onClick={handleProfileUpdate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                更新
              </button>
            </div>
          )}
          
          {/* 確定シフトの詳細表示 */}
          {(() => {
            console.log('=== CONFIRMED SHIFTS DISPLAY CONDITION CHECK ===');
            console.log('isSystemConfirmed:', isSystemConfirmed);
            console.log('selectedDates.length:', selectedDates.length);
            console.log('selectedDates:', selectedDates);
            console.log('confirmedShifts.length:', confirmedShifts.length);
            console.log('confirmedShifts:', confirmedShifts);
            return selectedDates.length > 0 && confirmedShifts.length > 0;
          })() && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-3">確定シフト一覧</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(() => {
                  // ログインユーザー（薬局）の確定シフトのみを表示
                  console.log('🔍 フィルタリング前の確認:', {
                    confirmedShiftsCount: confirmedShifts.length,
                    confirmedShifts: confirmedShifts.map(s => ({
                      id: s.id,
                      pharmacy_id: s.pharmacy_id,
                      pharmacist_id: s.pharmacist_id,
                      date: s.date,
                      time_slot: s.time_slot
                    })),
                    currentUserId: user?.id,
                    selectedDates
                  });
                  
                  const filteredShifts = confirmedShifts.filter((shift: any) => 
                    selectedDates.includes(shift.date) && shift.pharmacy_id === user?.id
                  );
                  console.log('Filtered confirmed shifts for display (pharmacy only):', {
                    selectedDates,
                    currentUserId: user?.id,
                    userObject: user,
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
                            time_slot_type: typeof timeSlot,
                            start_time: shift.start_time,
                            end_time: shift.end_time
                          });
                          
                          // start_timeとend_timeが存在する場合は優先表示
                          if (shift.start_time && shift.end_time) {
                            const startTime = shift.start_time.substring(0, 5);
                            const endTime = shift.end_time.substring(0, 5);
                            return `${startTime}-${endTime}`;
                          }
                          
                          // 定型時間帯の処理
                          if (timeSlot === 'morning' || timeSlot === 'am') {
                            return '9:00-13:00';
                          } else if (timeSlot === 'afternoon' || timeSlot === 'pm') {
                            return '13:00-18:00';
                          } else if (timeSlot === 'full' || timeSlot === 'fullday') {
                            return '9:00-18:00';
                          } else if (timeSlot === 'consult' || timeSlot === 'negotiable') {
                            return '要相談';
                          } else if (timeSlot === 'evening' || timeSlot === 'night') {
                            return '夜間';
                          } else if (timeSlot === 'custom') {
                            return 'カスタム時間';
                          } else {
                            console.warn('Unknown time_slot value:', timeSlot);
                            return `不明 (${timeSlot})`;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-gray-600">
                        薬剤師: {pharmacistProfile?.name || pharmacistProfile?.email || `薬剤師名未設定 (ID: ${shift.pharmacist_id})`}
                      </div>
                      
                      {/* 評価セクション */}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {(() => {
                          const existingRating = getExistingRating(ratings, shift.id);
                          const isEditing = editingRating === shift.id;
                          
                          if (isEditing) {
                            return (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700">薬剤師の評価</div>
                                {renderStarRating(ratingForm.rating, (rating) => 
                                  setRatingForm(prev => ({ ...prev, rating }))
                                )}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={async () => {
                                      // 認証ユーザーIDを取得
                                      const { data: { user: authUser } } = await supabase.auth.getUser();
                                      const pharmacyIdToUse = authUser?.id || user.id;
                                      
                                      await handleRatingSubmit(
                                        shift.id,
                                        shift.pharmacist_id,
                                        pharmacyIdToUse,
                                        ratingForm.rating,
                                        '', // コメントは常に空文字列
                                        setRatings,
                                        setEditingRating,
                                        setRatingForm
                                      );
                                    }}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRating(null);
                                      setRatingForm({ rating: 5, comment: '' });
                                    }}
                                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            );
                          } else if (existingRating) {
                            return (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-700">評価済み</div>
                                <div className="flex items-center space-x-2">
                                  {renderStarRating(existingRating.rating)}
                                  <span className="text-xs text-gray-600">
                                    ({existingRating.rating}/5)
                                  </span>
                                </div>
                                {existingRating.comment && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    {existingRating.comment}
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingRating(shift.id);
                                    setRatingForm({
                                      rating: existingRating.rating,
                                      comment: existingRating.comment || ''
                                    });
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  編集
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-700">薬剤師の評価</div>
                                <button
                                  onClick={() => {
                                    setEditingRating(shift.id);
                                    setRatingForm({ rating: 5, comment: '' });
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-300 px-2 py-1 rounded"
                                >
                                  評価する
                                </button>
                              </div>
                            );
                          }
                        })()}
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
                        <div className="text-gray-500">
                          {(() => {
                            // 登録済みデータの表示は時間帯名ではなく時間を優先
                            if (s.start_time && s.end_time) {
                              const st = String(s.start_time).substring(0, 5);
                              const et = String(s.end_time).substring(0, 5);
                              return `${st}-${et}`;
                            }
                            if (s.time_slot === 'morning') return '09:00-13:00';
                            if (s.time_slot === 'afternoon') return '13:00-18:00';
                            if (s.time_slot === 'full' || s.time_slot === 'fullday') return '09:00-18:00';
                            if (s.time_slot === 'consult' || s.time_slot === 'negotiable') return '要相談';
                            return '09:00-18:00';
                          })()} / {s.required_staff || 1}人
                        </div>
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
                {[{id:'morning',label:'9:00-13:00',icon:Sun,color:'bg-green-500 hover:bg-green-600'},
                  {id:'afternoon',label:'13:00-18:00',icon:Sun,color:'bg-orange-500 hover:bg-orange-600'},
                  {id:'full',label:'9:00-18:00',icon:Users,color:'bg-yellow-500 hover:bg-yellow-600'}].map(slot=>{
                    const Icon = slot.icon as any;
                    return (
                      <button 
                        key={slot.id} 
                        onClick={() => {
                          console.log('Time slot clicked:', slot.id);
                          setTimeSlot(slot.id);
                        }} 
                        className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${timeSlot===slot.id?slot.color:'bg-gray-300 hover:bg-gray-400'}`}
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


          {/* 作成/削除ボタン */}
          {selectedDates.length > 0 && confirmedShifts.some((s: any) => selectedDates.includes(s.date)) ? (
            <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium text-sm sm:text-base break-words">
              確定済みのため編集できません
            </div>
          ) : (
            <div>
            {(() => {
              // より詳細な条件チェック
              const currentTimeSlot = customTimeMode ? 'custom' : timeSlot;
              
              console.log('=== BUTTON RENDERING DEBUG ===');
              console.log('selectedDates:', selectedDates);
              console.log('user.id:', user?.id);
              console.log('timeSlot:', timeSlot);
              console.log('customTimeMode:', customTimeMode);
              console.log('currentTimeSlot:', currentTimeSlot);
              console.log('myShifts:', myShifts);
              console.log('myShifts length:', myShifts?.length || 0);
              
              // 各myShiftの詳細をログ出力
              if (myShifts && myShifts.length > 0) {
                console.log('=== MYSHIFTS DETAIL ===');
                myShifts.forEach((shift: any, index: number) => {
                  console.log(`Shift ${index}:`, {
                    id: shift.id,
                    date: shift.date,
                    time_slot: shift.time_slot,
                    pharmacy_id: shift.pharmacy_id,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    store_name: shift.store_name
                  });
                });
              }
              
              // 既存募集の検出（日付と薬局IDのみで判定、時間帯は柔軟に）
              const existingPosting = selectedDates.length > 0 && myShifts ? myShifts.find((s: any) => {
                const dateMatch = selectedDates.includes(s.date);
                const pharmacyMatch = s.pharmacy_id === user?.id;
                
                console.log(`Checking shift ${s.id}:`, {
                  dateMatch,
                  pharmacyMatch,
                  shiftDate: s.date,
                  shiftPharmacyId: s.pharmacy_id,
                  shiftTimeSlot: s.time_slot,
                  currentTimeSlot
                });
                
                // 日付と薬局IDが一致すれば既存募集とみなす（時間帯は更新可能）
                return dateMatch && pharmacyMatch;
              }) : null;
              
              const hasExistingPosting = !!existingPosting;
              console.log('hasExistingPosting:', hasExistingPosting);
              console.log('existingPosting:', existingPosting);
              
              if (hasExistingPosting && existingPosting) {
                // 既存の募集がある場合は「募集を更新」と「募集を削除」の両方を表示
                return (
                  <div className="space-y-3 mt-4 mb-4">
                    <button 
                      type="button"
                      onClick={() => {
                        console.log('=== BUTTON CLICK START ===');
                        console.log('Form state:', { selectedDates, timeSlot, requiredStaff });
                        
                        if (!isRecruitmentOpen) {
                          alert('募集締切中のため編集できません');
                          return;
                        }
                        if (selectedDates.length === 0 || (!customTimeMode && !timeSlot) || (customTimeMode && (!startTime || !endTime)) || !requiredStaff) {
                          alert('募集日・時間帯・人数を選択してください');
                          return;
                        }
                        
                        console.log('Validation passed, calling handlePost');
                        handlePost();
                      }}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                        !isRecruitmentOpen
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                      disabled={!isRecruitmentOpen}
                    >
                      {!isRecruitmentOpen ? '募集締切中' : '募集を更新'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('=== DELETE BUTTON CLICKED ===');
                        console.log('existingPosting:', existingPosting);
                        if (existingPosting && existingPosting.id) {
                          console.log('Calling handleDeleteExisting with ID:', existingPosting.id);
                          handleDeleteExisting(existingPosting.id);
                        } else {
                          console.error('No existing posting ID found');
                          alert('削除対象の募集が見つかりません');
                        }
                      }}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                        !isRecruitmentOpen
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      disabled={!isRecruitmentOpen}
                    >
                      {!isRecruitmentOpen ? '募集締切中' : '募集を削除'}
                    </button>
                  </div>
                );
              } else {
                // 既存の募集がない場合は「募集を追加」のみ表示
                return (
                  <div className="mt-4 mb-4">
                    <button 
                      type="button"
                      onClick={() => {
                        console.log('=== BUTTON CLICK START ===');
                        console.log('Form state:', { selectedDates, timeSlot, requiredStaff });
                        
                        if (!isRecruitmentOpen) {
                          alert('募集締切中のため編集できません');
                          return;
                        }
                        if (selectedDates.length === 0 || (!customTimeMode && !timeSlot) || (customTimeMode && (!startTime || !endTime)) || !requiredStaff) {
                          alert('募集日・時間帯・人数を選択してください');
                          return;
                        }
                        
                        console.log('Validation passed, calling handlePost');
                        handlePost();
                      }}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                        !isRecruitmentOpen
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={!isRecruitmentOpen}
                    >
                      {!isRecruitmentOpen ? '募集締切中' : '募集を追加'}
                    </button>
                  </div>
                );
              }
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

// 評価機能の関数（コンポーネント外で定義）
const handleRatingSubmit = async (
  shiftId: string, 
  pharmacistId: string, 
  pharmacyId: string,
  rating: number,
  comment: string,
  setRatings: (ratings: any[]) => void,
  setEditingRating: (id: string | null) => void,
  setRatingForm: (form: { rating: number; comment: string }) => void
) => {
  try {
    console.log('=== RATING SUBMISSION START ===');
    console.log('Parameters:', {
      shiftId,
      pharmacistId,
      pharmacyId,
      rating,
      comment
    });
    
    // 認証状態の確認
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log('=== AUTH CHECK ===');
    console.log('Auth user:', authUser);
    console.log('Auth user ID:', authUser?.id);
    console.log('Pharmacy ID from parameter:', pharmacyId);
    console.log('IDs match:', authUser?.id === pharmacyId);
    console.log('Auth error:', authError);
    
    const ratingData = {
      pharmacy_id: authUser?.id || pharmacyId, // Use authenticated user ID if available
      pharmacist_id: pharmacistId,
      assigned_shift_id: shiftId,
      rating: rating,
      comment: comment
    };
    
    console.log('Rating data to submit:', ratingData);
    
    const { data, error } = await pharmacistRatings.upsertRating(ratingData);

    if (error) {
      console.error('=== RATING SUBMISSION ERROR ===');
      console.error('Error details:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert(`評価の保存に失敗しました: ${error.message || 'Unknown error'}`);
      return;
    }

    console.log('=== RATING SUBMISSION SUCCESS ===');
    console.log('Saved rating data:', data);

    // 評価データを再読み込み
    console.log('Reloading ratings data...');
    const { data: ratingsData } = await pharmacistRatings.getRatings({
      pharmacy_id: authUser?.id || pharmacyId
    });
    if (ratingsData) {
      console.log('Reloaded ratings:', ratingsData);
      setRatings(ratingsData);
    } else {
      console.log('No ratings data reloaded');
    }

    setEditingRating(null);
    setRatingForm({ rating: 5, comment: '' });
    alert('評価を保存しました');
  } catch (error) {
    console.error('Rating submission error:', error);
    alert('評価の保存中にエラーが発生しました');
  }
};

const getExistingRating = (ratings: any[], shiftId: string) => {
  return ratings.find(r => r.assigned_shift_id === shiftId);
};

const renderStarRating = (rating: number, onRatingChange?: (rating: number) => void) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange?.(star)}
          className={`${onRatingChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default PharmacyDashboard;
