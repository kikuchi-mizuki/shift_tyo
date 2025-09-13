import React, { useState, useEffect } from 'react';

import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, storeNgPharmacists, supabase } from '../lib/supabase';
import { MultiUserGuide } from './MultiUserGuide';

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
  const [storeNgPharmacists, setStoreNgPharmacists] = useState<{[pharmacyId: string]: any[]}>({});
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pharmacies: false,
    pharmacists: false
  });

  // 追加フォームの表示状態
  const [showAddForms, setShowAddForms] = useState<{[key: string]: boolean}>({
    posting: false,
    request: false
  });

  // 追加フォーム用のローカル状態
  const [newPosting, setNewPosting] = useState<any>({
    pharmacy_id: '',
    time_slot: 'morning',
    required_staff: 1,
    store_name: '',
    memo: ''
  });
  const [newRequest, setNewRequest] = useState<any>({
    pharmacist_id: '',
    time_slot: 'morning',
    priority: 'medium'
  });

  // 編集フォーム用の状態（募集/希望）
  const [editingPostingId, setEditingPostingId] = useState<string | null>(null);
  const [postingEditForm, setPostingEditForm] = useState<any>({
    time_slot: 'morning',
    required_staff: 1,
    store_name: '',
    memo: ''
  });
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestEditForm, setRequestEditForm] = useState<any>({
    time_slot: 'morning',
    priority: 'medium'
  });

  // ユーザー管理（編集/削除）
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState<any>({
    name: '',
    store_names: '', // カンマ区切り入力（薬局のみ）
    ng_list: [] as string[] // 薬局編集時: 薬剤師IDの配列
  });

  const beginEditUser = (profile: any) => {
    setEditingUserId(profile.id);
    setUserEditForm({
      name: profile.name || '',
      store_names: Array.isArray(profile.store_names) ? profile.store_names.join(',') : '',
      ng_list: Array.isArray(profile.ng_list) ? [...profile.ng_list] : []
    });
  };

  const saveEditUser = async (profile: any) => {
    try {
      const updates: any = { name: userEditForm.name };
      if (profile.user_type === 'pharmacy' || profile.user_type === 'store') {
        updates.store_names = (userEditForm.store_names || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
      // ng_list は配列で保存
      updates.ng_list = Array.isArray(userEditForm.ng_list)
        ? userEditForm.ng_list
        : String(userEditForm.ng_list || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        alert(`ユーザー更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }
      setEditingUserId(null);
      await loadAll();
      alert('ユーザー情報を更新しました');
    } catch (e: any) {
      alert(`ユーザー更新エラー: ${e?.message || 'Unknown error'}`);
    }
  };

  const deleteUser = async (profile: any) => {
    if (!confirm(`${profile.name || profile.email} を削除しますか？`)) {
      return;
    }
    try {
      console.log('Starting user deletion for:', profile.id, profile.name || profile.email);
      
      // 1) 関連レコードを先に削除（外部参照の可能性に備える）
      // assigned_shifts
      console.log('Deleting assigned_shifts...');
      const assignedDelete = await supabase
        .from('assigned_shifts')
        .delete()
        .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
      if ((assignedDelete as any).error) {
        console.error('assigned_shifts delete error:', (assignedDelete as any).error);
        throw (assignedDelete as any).error;
      }
      // shift_requests（薬剤師）
      const reqDelete = await supabase
        .from('shift_requests')
        .delete()
        .eq('pharmacist_id', profile.id);
      if ((reqDelete as any).error) {
        console.error('shift_requests delete error:', (reqDelete as any).error);
        throw (reqDelete as any).error;
      }

      // shift_postings（薬局）
      const postDelete = await supabase
        .from('shift_postings')
        .delete()
        .eq('pharmacy_id', profile.id);
      if ((postDelete as any).error) {
        console.error('shift_postings delete error:', (postDelete as any).error);
        throw (postDelete as any).error;
      }

      // 2) プロファイルを削除
      const profileDelete = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profile.id);
      if ((profileDelete as any).error) {
        console.error('user_profiles delete error:', (profileDelete as any).error);
        throw (profileDelete as any).error;
      }

      // 3) 画面更新
      await loadAll();
    } catch (e: any) {
      console.error('User deletion failed:', e);
      alert(`削除に失敗しました: ${e?.message || 'Unknown error'}`);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 薬局と薬剤師のデータを整理する関数
  const getOrganizedUserData = () => {
    console.log('getOrganizedUserData called with userProfiles:', userProfiles);
    const pharmacies: any[] = [];
    const pharmacists: any[] = [];

    Object.values(userProfiles).forEach((profile: any) => {
      console.log('Processing profile:', profile.id, profile.name, profile.user_type, 'ng_list:', profile.ng_list);
      if (profile.user_type === 'pharmacy') {
        pharmacies.push(profile);
      } else if (profile.user_type === 'pharmacist') {
        pharmacists.push(profile);
      }
    });

    console.log('Organized data - pharmacies:', pharmacies.length, 'pharmacists:', pharmacists.length);
    return { pharmacies, pharmacists };
  };


  useEffect(() => {
    console.log('=== ADMIN DASHBOARD MOUNTED ===');
    console.log('User:', user);
    loadAll();
  }, [user, currentDate]);

  const loadAll = async () => {
    try {
      console.log('loadAll started - データ読み込み開始');
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
                   
                   // user_profilesテーブルから詳細情報を取得
                   const { data: userProfilesData, error: userProfilesError } = await supabase
                     .from('user_profiles')
                     .select('*');
                   
                   if (userProfilesError) {
                     logToRailway('Error loading user_profiles:', userProfilesError);
                   } else {
                     console.log('user_profilesデータ取得成功:', userProfilesData);
                     console.log('user_profilesデータ件数:', userProfilesData?.length);
                     // 特定のIDのデータを確認
                     const targetId = '89077960-0074-4b50-8d47-1f08b222db1b';
                     const targetProfile = userProfilesData?.find(p => p.id === targetId);
                     console.log('対象IDのプロファイル:', targetProfile);
                   }
                   
                   const profilesMap: any = {};
                   
                   // まず、user_profilesの全データをマップに追加
                   userProfilesData?.forEach((profile: any) => {
                     profilesMap[profile.id] = {
                       id: profile.id,
                       name: profile.name,
                       email: profile.email,
                       ng_list: profile.ng_list || [],
                       store_names: profile.store_names || [],
                       address: profile.address,
                       phone: profile.phone
                     };
                   });
                   
                   // 次に、v_user_profilesのデータでuser_typeを設定
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
                     
                     // 既存のプロファイルにuser_typeを追加
                     if (profilesMap[user.id]) {
                       profilesMap[user.id].user_type = userType;
                     } else {
                       // v_user_profilesにのみ存在する場合は新規追加
                       profilesMap[user.id] = {
                         id: user.id,
                         name: user.name,
                         email: user.email,
                         user_type: userType,
                         ng_list: [],
                         store_names: []
                       };
                     }
                   });
                   
                   console.log('最終的なprofilesMap:', profilesMap);
                   console.log('対象IDの最終データ:', profilesMap['89077960-0074-4b50-8d47-1f08b222db1b']);
                   
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
          
          // 店舗毎のNG薬剤師データを取得
          logToRailway('Fetching store-specific NG pharmacists...');
          const storeNgDataMap: {[pharmacyId: string]: any[]} = {};
          
          // 薬局ユーザーのみを対象に店舗毎NG薬剤師を取得
          const pharmacyUsers = Object.values(profilesMap).filter((profile: any) => profile.user_type === 'pharmacy');
          for (const pharmacy of pharmacyUsers) {
            try {
              const { data: storeNgData, error: storeNgError } = await storeNgPharmacists.getStoreNgPharmacists(pharmacy.id);
              if (!storeNgError && storeNgData) {
                storeNgDataMap[pharmacy.id] = storeNgData;
              }
            } catch (error) {
              logToRailway(`Error fetching store NG pharmacists for ${pharmacy.id}:`, error);
            }
          }
          
          setStoreNgPharmacists(storeNgDataMap);
          logToRailway('Store NG pharmacists data:', storeNgDataMap);
          
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
      
      // 現在のユーザーIDを確認
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('Admin auth user:', authUser);
      console.log('Admin user prop:', user);
      
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
      
      // マッチング処理（カレンダーと同じロジック）
      dateGroups.forEach((group, date) => {
        console.log(`Processing date ${date}:`, group);
        
        // ヘルパー関数
        const getProfile = (id: string) => {
          if (!userProfiles) return {} as any;
          if (Array.isArray(userProfiles)) {
            return (userProfiles as any[]).find((u: any) => u?.id === id) || ({} as any);
          }
          return (userProfiles as any)[id] || ({} as any);
        };
        
        // 柔軟な時間帯マッチング関数
        const isTimeCompatible = (reqSlot: string, postSlot: string) => {
          // 完全一致の場合は常にマッチ
          if (reqSlot === postSlot) return true;
          
          // 薬剤師が終日希望の場合、薬局の募集に合わせてマッチ可能
          if (reqSlot === 'full' || reqSlot === 'fullday') {
            return postSlot === 'morning' || postSlot === 'afternoon' || postSlot === 'full' || postSlot === 'fullday';
          }
          
          // 薬剤師が午前希望の場合
          if (reqSlot === 'morning') {
            return postSlot === 'morning' || postSlot === 'full' || postSlot === 'fullday';
          }
          
          // 薬剤師が午後希望の場合
          if (reqSlot === 'afternoon') {
            return postSlot === 'afternoon' || postSlot === 'full' || postSlot === 'fullday';
          }
          
          // 薬剤師が要相談の場合、どの時間帯でもマッチ可能
          if (reqSlot === 'negotiable' || reqSlot === 'consult') {
            return true;
          }
          
          return false;
        };

        // この日付でマッチした薬剤師と薬局を追跡
        const matchedPharmacists: any[] = [];
        const matchedPharmacies: any[] = [];

        // 時間帯ごとにマッチング（完全一致を優先）
        const timeSlots = ['morning', 'afternoon', 'full'];
        
        // まず完全一致のマッチングを実行
        timeSlots.forEach((slot) => {
          const slotPostings = group.postings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
          const slotRequests = group.requests.filter((r: any) => r.time_slot === slot || (slot === 'full' && r.time_slot === 'fullday'));
          
          if (slotPostings.length === 0 || slotRequests.length === 0) return;
          
          // 薬剤師を優先順位でソート（高→中→低）
          const sortedRequests = slotRequests.sort((a: any, b: any) => {
            const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

          let remainingRequired = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);

          // 各薬局の必要人数を管理
          const pharmacyNeeds = slotPostings.map((p: any) => ({
            ...p,
            remaining: Number(p.required_staff) || 0
          }));

          // 完全一致のマッチング（優先順位順に薬剤師をマッチング）
          sortedRequests.forEach((request: any) => {
            if (remainingRequired <= 0) return;

            const pharmacist = getProfile(request.pharmacist_id);
            const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];

            // 利用可能な薬局を探す
            for (const pharmacyNeed of pharmacyNeeds) {
              if (pharmacyNeed.remaining <= 0) continue;

              const pharmacy = getProfile(pharmacyNeed.pharmacy_id);
              const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];

              const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
              const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

              // 完全一致のみをチェック
              if (!blockedByPharmacist && !blockedByPharmacy && request.time_slot === slot) {
                // 店舗名を取得（postingから）
                const getStoreNameFromPosting = (posting: any) => {
                  console.log('getStoreNameFromPosting called with posting:', posting);
                  const direct = (posting.store_name || '').trim();
                  let fromMemo = '';
                  if (!direct && typeof posting.memo === 'string') {
                    const m = posting.memo.match(/\[store:([^\]]+)\]/);
                    if (m && m[1]) fromMemo = m[1];
                  }
                  const result = direct || fromMemo || '';
                  console.log('getStoreNameFromPosting result:', {
                    direct,
                    fromMemo,
                    final: result,
                    posting_store_name: posting.store_name,
                    posting_memo: posting.memo
                  });
                  return result;
                };
                
                const storeName = getStoreNameFromPosting(pharmacyNeed);
                console.log('Final storeName for shift:', storeName);
                
                // 薬局の募集時間帯に合わせて薬剤師の時間帯を調整
                const adjustedTimeSlot = pharmacyNeed.time_slot;
                
                const confirmedShift = {
                  pharmacist_id: request.pharmacist_id,
                  pharmacy_id: pharmacyNeed.pharmacy_id,
                  date: date,
                  time_slot: adjustedTimeSlot, // 薬局の募集時間帯を使用
                  status: 'confirmed',
                  store_name: storeName,
                  memo: pharmacyNeed.memo || '',
                  created_at: new Date().toISOString()
                };
                console.log('Creating confirmed shift:', confirmedShift);
                console.log('Request pharmacist_id:', request.pharmacist_id);
                console.log('Request object:', request);
                confirmedShifts.push(confirmedShift);
                
                matchedPharmacists.push(request);
                matchedPharmacies.push(pharmacyNeed);
                pharmacyNeed.remaining--;
                remainingRequired--;
                break;
              }
            }
          });
        });
        
        // 完全一致のマッチング後に、柔軟なマッチングを実行
        timeSlots.forEach((slot) => {
          const slotPostings = group.postings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
          
          if (slotPostings.length === 0) return;
          
          // まだマッチしていない薬剤師を取得
          const unmatchedRequests = group.requests.filter((req: any) => 
            !matchedPharmacists.some(matched => matched.id === req.id)
          );
          
          if (unmatchedRequests.length === 0) return;
          
          // 薬剤師を優先順位でソート（高→中→低）
          const sortedUnmatchedRequests = unmatchedRequests.sort((a: any, b: any) => {
            const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

          // 各薬局の必要人数を管理
          const pharmacyNeeds = slotPostings.map((p: any) => ({
            ...p,
            remaining: Number(p.required_staff) || 0
          }));

          // 柔軟なマッチング（薬局の募集に合わせて薬剤師を調整）
          sortedUnmatchedRequests.forEach((request: any) => {
            const pharmacist = getProfile(request.pharmacist_id);
            const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];

            // 利用可能な薬局を探す
            for (const pharmacyNeed of pharmacyNeeds) {
              if (pharmacyNeed.remaining <= 0) continue;

              const pharmacy = getProfile(pharmacyNeed.pharmacy_id);
              const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];

              const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
              const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

              // 柔軟な時間帯マッチングをチェック
              if (!blockedByPharmacist && !blockedByPharmacy && isTimeCompatible(request.time_slot, slot)) {
                // 店舗名を取得（postingから）
                const getStoreNameFromPosting = (posting: any) => {
                  const direct = (posting.store_name || '').trim();
                  let fromMemo = '';
                  if (!direct && typeof posting.memo === 'string') {
                    const m = posting.memo.match(/\[store:([^\]]+)\]/);
                    if (m && m[1]) fromMemo = m[1];
                  }
                  return direct || fromMemo || '';
                };
                
                const storeName = getStoreNameFromPosting(pharmacyNeed);
                
                // 薬局の募集時間帯に合わせて薬剤師の時間帯を調整
                const adjustedTimeSlot = pharmacyNeed.time_slot;
                
                const confirmedShift = {
                  pharmacist_id: request.pharmacist_id,
                  pharmacy_id: pharmacyNeed.pharmacy_id,
                  date: date,
                  time_slot: adjustedTimeSlot, // 薬局の募集時間帯を使用
                  status: 'confirmed',
                  store_name: storeName,
                  memo: pharmacyNeed.memo || '',
                  created_at: new Date().toISOString()
                };
                
                console.log('Creating flexible matched shift:', confirmedShift);
                confirmedShifts.push(confirmedShift);
                
                matchedPharmacists.push(request);
                matchedPharmacies.push(pharmacyNeed);
                pharmacyNeed.remaining--;
                break;
              }
            }
          });
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
      
      // データを再読み込み
      loadAll();
    } catch (error) {
      console.error('Error in handleConfirmShifts:', error);
      alert(`シフトの確定に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 募集 追加
  const handleAddPosting = async () => {
    if (!selectedDate) {
      alert('日付を選択してください');
      return;
    }
    if (!newPosting.pharmacy_id) {
      alert('薬局を選択してください');
      return;
    }
    const payload = [{
      pharmacy_id: newPosting.pharmacy_id,
      date: selectedDate,
      time_slot: newPosting.time_slot,
      required_staff: Number(newPosting.required_staff) || 1,
      store_name: (newPosting.store_name || '').trim() || null,
      memo: (newPosting.memo || '').trim() || null,
      status: 'recruiting'
    }];
    const { error } = await shiftPostings.createPostings(payload);
    if (error) {
      const e: any = error as any;
      alert(`募集の追加に失敗しました: ${e?.message || e?.code || 'Unknown error'}`);
      return;
    }
    setNewPosting({ pharmacy_id: '', time_slot: 'morning', required_staff: 1, store_name: '', memo: '' });
    loadAll();
  };

  // 希望 追加
  const handleAddRequest = async () => {
    if (!selectedDate) {
      alert('日付を選択してください');
      return;
    }
    if (!newRequest.pharmacist_id) {
      alert('薬剤師を選択してください');
      return;
    }
    const payload = [{
      pharmacist_id: newRequest.pharmacist_id,
      date: selectedDate,
      time_slot: newRequest.time_slot,
      priority: newRequest.priority
    }];
    const { error } = await shiftRequests.createRequests(payload);
    if (error) {
      const e: any = error as any;
      alert(`希望の追加に失敗しました: ${e?.message || e?.code || 'Unknown error'}`);
      return;
    }
    setNewRequest({ pharmacist_id: '', time_slot: 'morning', priority: 'medium' });
    loadAll();
  };

  // 募集 編集開始/保存
  const beginEditPosting = (p: any) => {
    setEditingPostingId(p.id);
    setPostingEditForm({
      time_slot: p.time_slot === 'fullday' ? 'full' : p.time_slot,
      required_staff: p.required_staff,
      store_name: p.store_name || '',
      memo: p.memo || ''
    });
  };
  const saveEditPosting = async (postingId: string) => {
    const { error } = await shiftPostings.updatePosting(postingId, {
      time_slot: postingEditForm.time_slot,
      required_staff: Number(postingEditForm.required_staff) || 1,
      store_name: (postingEditForm.store_name || '').trim() || null,
      memo: (postingEditForm.memo || '').trim() || null
    });
    if (error) {
      alert(`募集の更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
      return;
    }
    setEditingPostingId(null);
    loadAll();
  };

  // 希望 編集開始/保存
  const beginEditRequest = (r: any) => {
    setEditingRequestId(r.id);
    setRequestEditForm({
      time_slot: r.time_slot === 'fullday' ? 'full' : r.time_slot,
      priority: r.priority || 'medium'
    });
  };
  const saveEditRequest = async (requestId: string) => {
    const { error } = await shiftRequestsAdmin.updateRequest(requestId, {
      time_slot: requestEditForm.time_slot,
      priority: requestEditForm.priority
    });
    if (error) {
      alert(`希望の更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
      return;
    }
    setEditingRequestId(null);
    loadAll();
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
      
      // システム状態を未確定に戻す
      setSystemStatus('pending');
      setLastUpdated(new Date());
      
      loadAll();
    } catch (error) {
      console.error('Error in handleCancelConfirmedShifts:', error);
      alert(`確定シフトの取り消しに失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 全確定シフトの一括取り消し
  const handleCancelAllConfirmedShifts = async () => {
    if (!confirm('全ての確定シフトを取り消しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assigned_shifts')
        .delete()
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error canceling all confirmed shifts:', error);
        alert(`全確定シフトの取り消しに失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      alert('全ての確定シフトを取り消しました');
      
      // システム状態を未確定に戻す
      setSystemStatus('pending');
      setLastUpdated(new Date());
      
      loadAll();
    } catch (error) {
      console.error('Error in handleCancelAllConfirmedShifts:', error);
      alert(`全確定シフトの取り消しに失敗しました: ${(error as any).message || 'Unknown error'}`);
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
      <MultiUserGuide userType="admin" />
      
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
              
              // その日の希望と募集を取得（要相談を除外）
              const dayRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult');
              const dayPostings = postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult');
              // 要相談のリクエストを取得
              const dayConsultRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult');
              
              
              // マッチング状況を計算
              const calculateMatchingStatus = () => {
                if (dayAssignedShifts.length > 0) {
                  return { type: 'confirmed', count: dayAssignedShifts.length, requestsCount: dayRequests.length } as any;
                }
                if (dayRequests.length === 0 && dayPostings.length === 0) {
                  return { type: 'empty', count: 0, requestsCount: 0 } as any;
                }

                // ヘルパー
                const getProfile = (id: string) => {
                  if (!userProfiles) return {} as any;
                  if (Array.isArray(userProfiles)) {
                    return (userProfiles as any[]).find((u: any) => u?.id === id) || ({} as any);
                  }
                  return (userProfiles as any)[id] || ({} as any);
                };
                const isTimeCompatible = (reqSlot: string, postSlot: string) => reqSlot === postSlot;

                const timeSlots = ['morning','afternoon','full'];
                let totalRequired = 0;
                let totalAvailable = 0;
                let totalMatched = 0;
                let totalShortage = 0;
                let totalExcess = 0;

                timeSlots.forEach((slot) => {
                  const slotPostings = dayPostings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
                  const slotRequests = dayRequests.filter((r: any) => r.time_slot === slot || (slot === 'full' && r.time_slot === 'fullday'));
                  const requiredSlot = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);
                  const availableSlot = slotRequests.length;

                  // 右の詳細パネルと同じマッチングシミュレーション
                  const sortedRequests = slotRequests.sort((a: any, b: any) => {
                    const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                  });

                  const matchedPharmacists: any[] = [];
                  const matchedPharmacies: any[] = [];
                  let remainingRequired = requiredSlot;

                  // 各薬局の必要人数を管理
                  const pharmacyNeeds = slotPostings.map((p: any) => ({
                    pharmacy_id: p.pharmacy_id,
                    required: Number(p.required_staff) || 0,
                    remaining: Number(p.required_staff) || 0,
                    store_name: p.store_name
                  }));

                  // 優先順位順にマッチング
                  for (const request of sortedRequests) {
                    if (remainingRequired <= 0) break;

                    const pharmacist = getProfile(request.pharmacist_id);
                    const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];

                    // 利用可能な薬局を探す
                    for (const pharmacyNeed of pharmacyNeeds) {
                      if (pharmacyNeed.remaining <= 0) continue;

                      const pharmacy = getProfile(pharmacyNeed.pharmacy_id);
                      const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];

                      const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
                      const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

                      if (!blockedByPharmacist && !blockedByPharmacy && isTimeCompatible(request.time_slot, slot)) {
                        matchedPharmacists.push(request);
                        matchedPharmacies.push(pharmacyNeed);
                        pharmacyNeed.remaining--;
                        remainingRequired--;
                        break;
                      }
                    }
                  }

                  const matchedSlot = matchedPharmacists.length;
                  const shortageSlot = Math.max(requiredSlot - matchedSlot, 0);
                  const excessSlot = Math.max(availableSlot - matchedSlot, 0);

                  // デバッグ用ログ
                  console.log(`時間帯 ${slot}: 必要=${requiredSlot}, 利用可能=${availableSlot}, マッチ=${matchedSlot}, 不足=${shortageSlot}, 余裕=${excessSlot}`);
                  console.log(`マッチング詳細:`, { matchedPharmacists, pharmacyNeeds });

                  totalRequired += requiredSlot;
                  totalAvailable += availableSlot;
                  totalMatched += matchedSlot;
                  totalShortage += shortageSlot;
                  totalExcess += excessSlot;
                });

                // デバッグ用ログ
                console.log(`日付 ${dateStr}: 総必要=${totalRequired}, 総利用可能=${totalAvailable}, 総マッチ=${totalMatched}, 総不足=${totalShortage}`);
                console.log(`カレンダー計算: 不足=${totalShortage}, 余裕=${totalExcess}`);

                if (totalRequired === 0) {
                  return totalAvailable > 0 ? { type: 'requests_only', count: totalAvailable, requestsCount: totalAvailable } as any : { type: 'empty', count: 0, requestsCount: 0 } as any;
                }

                return { type: 'summary', count: totalMatched, shortage: totalShortage, excess: totalExcess, requestsCount: totalAvailable } as any;
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
                          <div className="text-[7px] sm:text-[8px] space-y-0.5">
                            <div className="text-green-700 bg-green-50 border border-green-200 rounded px-1 inline-block">
                              確定 {matchingStatus.count}件
                            </div>
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                相談 {dayConsultRequests.length}
                              </div>
                            )}
                          </div>
                          
                          {/* ホバー詳細は右側パネルで表示するため非表示に変更 */}
                        </div>
                      )}
                      
                      {/* マッチング状況表示（確定シフトがない場合） */}
                      {matchingStatus.type !== 'confirmed' && matchingStatus.type !== 'empty' && (
                        <div className="relative group">
                          <div className="text-[7px] sm:text-[8px] space-y-0.5">
                            {/* マッチング数（募集がある日だけ表示） */}
                            {matchingStatus.type !== 'requests_only' && matchingStatus.count > 0 && (
                              <div className="text-green-600 bg-green-50 border border-green-200 rounded px-1 inline-block">
                                マッチ {matchingStatus.count}
                              </div>
                            )}
                            
                            {/* 不足数 */}
                            {matchingStatus.shortage > 0 && (
                              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                                不足 {matchingStatus.shortage}
                              </div>
                            )}
                            
                            {/* 余裕数 */}
                            {typeof matchingStatus.excess === 'number' && matchingStatus.excess > 0 && (
                              <div className="text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-1 inline-block">
                                余裕 {matchingStatus.excess}
                              </div>
                            )}
                            
                            
                            {/* 相談数 */}
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                相談 {dayConsultRequests.length}
                              </div>
                            )}
                          </div>
                          
                          {/* ホバー詳細は右側パネルで表示するため非表示に変更 */}
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
          
          {/* シフト確定ボタン - 固定表示 */}
          <div className="p-4 lg:p-6 pb-0 flex-shrink-0 space-y-2">
            <button 
              onClick={handleConfirmShifts}
              className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium text-white text-sm ${
                systemStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフトを確定する'}</span>
            </button>
            
            {/* 一括確定取り消しボタン - 確定済みの場合のみ表示 */}
            {systemStatus === 'confirmed' && (
              <button 
                onClick={handleCancelAllConfirmedShifts}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium text-white text-sm bg-red-600 hover:bg-red-700"
              >
                <AlertCircle className="w-4 h-4" />
                <span>全確定シフトを取り消し</span>
              </button>
            )}
          </div>

          {/* スクロール可能な詳細エリア */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-4 space-y-4">
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
                                  </select>
                                </div>
                              </div>
                            ) : (
                              // 表示モード - 1行でシンプルに
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-xs text-gray-800 leading-snug break-words">
                                    {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'} → {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(shift)})
                                  </div>
                                  <div className="mt-1">
                                    <button
                                      onClick={() => handleEditShift(shift)}
                                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                    >
                                      編集
                                    </button>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {shift.time_slot === 'morning' ? '午前' : shift.time_slot === 'afternoon' ? '午後' : shift.time_slot === 'full' ? '終日' : '要相談'}
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
                  {(
                    <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-orange-800">
                          募集している薬局 ({postings.filter((p: any) => p.date === selectedDate && p.time_slot !== 'consult').length}件)
                        </h4>
                      </div>
                      {/* 追加ボタン */}
                      <div className="mb-3">
                        <button 
                          onClick={() => setShowAddForms({...showAddForms, posting: !showAddForms.posting})}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
                        >
                          {showAddForms.posting ? 'フォームを閉じる' : '募集を追加'}
                        </button>
                      </div>
                      
                      {/* 追加フォーム */}
                      {showAddForms.posting && (
                        <div className="mb-3 bg-white border rounded p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.pharmacy_id}
                              onChange={(e) => setNewPosting({ ...newPosting, pharmacy_id: e.target.value })}
                            >
                              <option value="">薬局を選択</option>
                              {Object.entries(userProfiles)
                                .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy' || (profile as any).user_type === 'store')
                                .map(([id, profile]: [string, any]) => (
                                  <option key={id} value={id}>{(profile as any).name || (profile as any).email}</option>
                                ))}
                            </select>
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.time_slot}
                              onChange={(e) => setNewPosting({ ...newPosting, time_slot: e.target.value })}
                            >
                              <option value="morning">午前</option>
                              <option value="afternoon">午後</option>
                              <option value="full">終日</option>
                            </select>
                            <input
                              className="text-xs border rounded px-2 py-1"
                              type="number"
                              min={1}
                              value={newPosting.required_staff}
                              onChange={(e) => setNewPosting({ ...newPosting, required_staff: e.target.value })}
                              placeholder="必要人数"
                            />
                            <input
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.store_name}
                              onChange={(e) => setNewPosting({ ...newPosting, store_name: e.target.value })}
                              placeholder="店舗名（任意）"
                            />
                            <input
                              className="col-span-2 text-xs border rounded px-2 py-1"
                              value={newPosting.memo}
                              onChange={(e) => setNewPosting({ ...newPosting, memo: e.target.value })}
                              placeholder="メモ（任意）"
                            />
                          </div>
                          <div className="mt-2">
                            <button onClick={handleAddPosting} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded">追加</button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {postings.filter((p: any) => p.date === selectedDate && p.time_slot !== 'consult').map((posting: any, index: number) => {
                        const pharmacyProfile = userProfiles[posting.pharmacy_id];
                        const isEditing = editingPostingId === posting.id;
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
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    className="text-xs border rounded px-2 py-1"
                                    value={postingEditForm.time_slot}
                                    onChange={(e) => setPostingEditForm({ ...postingEditForm, time_slot: e.target.value })}
                                  >
                                    <option value="morning">午前</option>
                                    <option value="afternoon">午後</option>
                                    <option value="full">終日</option>
                                  </select>
                                  <input
                                    className="text-xs border rounded px-2 py-1"
                                    type="number"
                                    min={1}
                                    value={postingEditForm.required_staff}
                                    onChange={(e) => setPostingEditForm({ ...postingEditForm, required_staff: e.target.value })}
                                    placeholder="必要人数"
                                  />
                                  <input
                                    className="text-xs border rounded px-2 py-1"
                                    value={postingEditForm.store_name}
                                    onChange={(e) => setPostingEditForm({ ...postingEditForm, store_name: e.target.value })}
                                    placeholder="店舗名（任意）"
                                  />
                                  <input
                                    className="text-xs border rounded px-2 py-1"
                                    value={postingEditForm.memo}
                                    onChange={(e) => setPostingEditForm({ ...postingEditForm, memo: e.target.value })}
                                    placeholder="メモ（任意）"
                                  />
                                </div>
                                <div className="text-right space-x-1">
                                  <button onClick={() => saveEditPosting(posting.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">保存</button>
                                  <button onClick={() => setEditingPostingId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded">キャンセル</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-xs text-gray-800 leading-snug break-words">
                                    {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(posting)})
                                  </div>
                                  <div className="mt-1">
                                    <button onClick={() => beginEditPosting(posting)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {posting.time_slot === 'morning' ? '午前' : posting.time_slot === 'afternoon' ? '午後' : '終日'} / {posting.required_staff}人
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* シフト希望 */}
                  {(
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-blue-800">
                          応募している薬剤師 ({requests.filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult').length}件)
                        </h4>
                      </div>
                      {/* 追加ボタン */}
                      <div className="mb-3">
                        <button 
                          onClick={() => setShowAddForms({...showAddForms, request: !showAddForms.request})}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
                        >
                          {showAddForms.request ? 'フォームを閉じる' : '希望を追加'}
                        </button>
                      </div>
                      
                      {/* 追加フォーム */}
                      {showAddForms.request && (
                        <div className="mb-3 bg-white border rounded p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newRequest.pharmacist_id}
                              onChange={(e) => setNewRequest({ ...newRequest, pharmacist_id: e.target.value })}
                            >
                              <option value="">薬剤師を選択</option>
                              {Object.entries(userProfiles)
                                .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacist')
                                .map(([id, profile]: [string, any]) => (
                                  <option key={id} value={id}>{(profile as any).name || (profile as any).email}</option>
                                ))}
                            </select>
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newRequest.time_slot}
                              onChange={(e) => setNewRequest({ ...newRequest, time_slot: e.target.value })}
                            >
                              <option value="morning">午前</option>
                              <option value="afternoon">午後</option>
                              <option value="full">終日</option>
                            </select>
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newRequest.priority}
                              onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                            >
                              <option value="high">高</option>
                              <option value="medium">中</option>
                              <option value="low">低</option>
                            </select>
                          </div>
                          <div className="mt-2">
                            <button onClick={handleAddRequest} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded">追加</button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {requests.filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult').map((request: any, index: number) => {
                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                        const isEditing = editingRequestId === request.id;
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    className="text-xs border rounded px-2 py-1"
                                    value={requestEditForm.time_slot}
                                    onChange={(e) => setRequestEditForm({ ...requestEditForm, time_slot: e.target.value })}
                                  >
                                    <option value="morning">午前</option>
                                    <option value="afternoon">午後</option>
                                    <option value="full">終日</option>
                                  </select>
                                  <select
                                    className="text-xs border rounded px-2 py-1"
                                    value={requestEditForm.priority}
                                    onChange={(e) => setRequestEditForm({ ...requestEditForm, priority: e.target.value })}
                                  >
                                    <option value="high">高</option>
                                    <option value="medium">中</option>
                                    <option value="low">低</option>
                                  </select>
                                </div>
                                <div className="text-right space-x-1">
                                  <button onClick={() => saveEditRequest(request.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">保存</button>
                                  <button onClick={() => setEditingRequestId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded">キャンセル</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-xs text-gray-800 leading-snug break-words">
                                    {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                                  </div>
                                  <div className="mt-1">
                                    <button onClick={() => beginEditRequest(request)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 whitespace-nowrap">
                                  <div className="text-xs text-gray-500">
                                    {request.time_slot === 'morning' ? '午前' : request.time_slot === 'afternoon' ? '午後' : '終日'}
                                  </div>
                                  <div className={`text-xs font-medium ${priorityColor}`}>
                                    {request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'}
                                  </div>
                                </div>
                              </div>
                            )}
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
                    const timeSlots = ['morning', 'afternoon', 'full'];
                    const matchingAnalysis = timeSlots.map(timeSlot => {
                      const slotRequests = dayRequests.filter((r: any) => r.time_slot === timeSlot || (timeSlot === 'full' && r.time_slot === 'fullday'));
                      const slotPostings = dayPostings.filter((p: any) => p.time_slot === timeSlot || (timeSlot === 'full' && p.time_slot === 'fullday'));
                      
                      if (slotRequests.length === 0 && slotPostings.length === 0) return null;
                      
                      // 薬剤師を優先順位でソート（高→中→低）
                      const sortedRequests = slotRequests.sort((a: any, b: any) => {
                        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      });
                      
                      const totalRequired = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);
                      const totalAvailable = sortedRequests.length;
                      
                      // マッチングシミュレーション（優先順位順）
                      const matchedPharmacists: any[] = [];
                      const matchedPharmacies: any[] = [];
                      let remainingRequired = totalRequired;
                      
                      // 各薬局の必要人数を管理
                      const pharmacyNeeds = slotPostings.map((p: any) => ({
                        ...p,
                        remaining: Number(p.required_staff) || 0
                      }));
                      
                      // 優先順位順に薬剤師をマッチング（NGリストを考慮）
                      sortedRequests.forEach((request: any) => {
                        if (remainingRequired > 0) {
                          // 薬剤師のNGリストを取得
                          const pharmacistProfile = userProfiles[request.pharmacist_id];
                          const pharmacistNg: string[] = Array.isArray(pharmacistProfile?.ng_list) ? pharmacistProfile.ng_list : [];
                          
                          // まだ人員が必要で、NGリストに含まれていない薬局を探す
                          const availablePharmacy = pharmacyNeeds.find((p: any) => 
                            p.remaining > 0 && !pharmacistNg.includes(p.pharmacy_id)
                          );
                          if (availablePharmacy) {
                            // 薬局のNGリストも確認
                            const pharmacyProfile = userProfiles[availablePharmacy.pharmacy_id];
                            const pharmacyNg: string[] = Array.isArray(pharmacyProfile?.ng_list) ? pharmacyProfile.ng_list : [];
                            
                            if (!pharmacyNg.includes(request.pharmacist_id)) {
                              matchedPharmacists.push(request);
                              matchedPharmacies.push(availablePharmacy);
                              availablePharmacy.remaining--;
                              remainingRequired--;
                            }
                          }
                        }
                      });
                      
                      // 不足の薬局一覧（remaining > 0）
                      const shortagePharmacies = pharmacyNeeds
                        .filter((p: any) => p.remaining > 0)
                        .map((p: any) => ({ pharmacy_id: p.pharmacy_id, remaining: p.remaining, store_name: p.store_name }));

                      return {
                        timeSlot,
                        requests: sortedRequests,
                        postings: slotPostings,
                        totalRequired,
                        totalAvailable,
                        totalMatched: matchedPharmacists.length,
                        matchedPharmacists,
                        matchedPharmacies,
                        remainingRequired,
                        shortagePharmacies,
                        isMatching: totalAvailable > 0 && totalRequired > 0,
                        isShortage: totalAvailable < totalRequired,
                        hasExcess: totalAvailable > totalRequired
                      };
                    }).filter(Boolean);
                    
                    // デバッグ用ログ
                    console.log('マッチング分析結果:', matchingAnalysis);
                    logToRailway('マッチング分析結果:', matchingAnalysis);
                    
                    // マッチング状況を表示（分析結果がある場合、または募集のみの場合）
                    if (matchingAnalysis.length > 0 || (dayPostings.length > 0 && dayRequests.length === 0)) {
                      return (
                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <h4 className="text-xs font-semibold text-purple-800">マッチング状況</h4>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            
                            {/* 募集のみの場合の表示 */}
                            {matchingAnalysis.length === 0 && dayPostings.length > 0 && dayRequests.length === 0 && (
                              <div className="bg-white rounded border px-2 py-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-medium text-gray-800">全体</div>
                                  <div className="text-xs text-gray-500">
                                    {dayPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0)}人必要 / 0人応募
                                    <span className="text-red-600 ml-1">
                                      (不足{dayPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0)}人)
                                    </span>
                                    <span className="text-blue-600 ml-1">(希望0人)</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600">
                                  薬剤師からの希望がありません
                                </div>
                              </div>
                            )}
                          {matchingAnalysis.map((analysis: any, index: number) => (
                            <div key={index} className="bg-white rounded border px-2 py-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-800">
                                  {analysis.timeSlot === 'morning' ? '午前' : 
                                   analysis.timeSlot === 'afternoon' ? '午後' : 
                                   analysis.timeSlot === 'full' ? '終日' : analysis.timeSlot}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {analysis.totalRequired}人必要 / {analysis.totalAvailable}人応募
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">
                              {analysis.isMatching ? (
                                <>
                                  {/* マッチング済みの薬剤師と薬局 */}
                                  {analysis.matchedPharmacists.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium text-green-700 mb-1">✅ マッチング済み ({analysis.totalMatched}人):</div>
                                      {analysis.matchedPharmacists.map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const pharmacyProfile = userProfiles[analysis.matchedPharmacies[idx].pharmacy_id];
                                        const storeName = analysis.matchedPharmacies[idx].store_name || '店舗名なし';
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                                            <span className="text-xs">
                                              <span className="font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                              <span className="text-gray-500"> → </span>
                                              <span className="font-medium">{pharmacyProfile?.name || pharmacyProfile?.email || '名前未設定'}</span>
                                              <span className="text-gray-500"> ({storeName})</span>
                                            </span>
                                            <span className={`text-xs ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 未マッチングの薬剤師（余裕がある場合） */}
                                  {analysis.remainingRequired === 0 && analysis.hasExcess && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 余裕 ({analysis.totalAvailable - analysis.totalRequired}人):</div>
                                      {analysis.requests.slice(analysis.totalRequired).map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <span className="text-xs font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                            <span className={`text-xs ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 余裕の薬剤師（未マッチング） - マッチング済みの場合のみ表示 */}
                                  {analysis.totalMatched > 0 && analysis.requests.length > analysis.totalMatched && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 余裕の薬剤師 ({analysis.requests.length - analysis.totalMatched}人):</div>
                                      {analysis.requests.filter((request: any) => 
                                        !analysis.matchedPharmacists.some((mp: any) => mp.id === request.id)
                                      ).map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <span className="text-xs font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                            <span className={`text-xs ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                </>
                              ) : (
                                <>
                                  <div className="text-xs">
                                    {analysis.requests.length > 0 ? '薬剤師のみ応募' : '薬局のみ募集'}
                                  </div>
                                  {/* 薬剤師のみ応募の場合の余裕の薬剤師を表示 */}
                                  {analysis.requests.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 余裕の薬剤師 ({analysis.requests.length}人):</div>
                                      {analysis.requests.map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        return (
                                          <div key={idx} className="flex items-center justify-between bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <span className="text-xs font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                            <span className={`text-xs ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* 不足の薬局一覧 */}
                              {analysis.shortagePharmacies && analysis.shortagePharmacies.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-xs font-medium text-red-700 mb-1">🚨 不足している薬局 ({analysis.remainingRequired}人):</div>
                                  {analysis.shortagePharmacies.map((ph: any, idx: number) => {
                                    const pharmacyProfile = userProfiles[ph.pharmacy_id];
                                    const pharmacyName = pharmacyProfile?.name || pharmacyProfile?.email || '名前未設定';
                                    const storeLabel = ph.store_name ? `（${ph.store_name}）` : '';
                                    return (
                                      <div key={idx} className="flex items-center justify-between bg-red-50 px-2 py-1 rounded mb-1">
                                        <span className="text-xs font-medium">{pharmacyName}{storeLabel}</span>
                                        <span className="text-xs text-red-600 font-medium">不足 {ph.remaining}人</span>
                                      </div>
                                    );
                                  })}
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
                  
                  {/* 要相談セクション */}
                  {(() => {
                    const dayConsultRequests = requests.filter((r: any) => r.date === selectedDate && r.time_slot === 'consult');
                    if (dayConsultRequests.length === 0) return null;
                    
                    return (
                      <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-purple-800">
                            要相談 ({dayConsultRequests.length}件)
                          </h4>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dayConsultRequests.map((request: any) => {
                            const pharmacistProfile = userProfiles[request.pharmacist_id];
                            const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                            
                            return (
                              <div key={request.id} className="bg-white rounded border px-2 py-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 pr-2">
                                    <div className="text-xs text-gray-800 leading-snug break-words">
                                      {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                                    </div>
                                    {request.memo && (
                                      <div className="text-xs text-gray-600 mt-1 italic">
                                        📝 {request.memo}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 whitespace-nowrap">
                                    <div className="text-xs text-purple-600 font-medium">
                                      相談
                                    </div>
                                    <div className={`text-xs font-medium ${priorityColor}`}>
                                      {request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
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
                  onClick={() => {
                    console.log('Pharmacies section toggle clicked, current state:', expandedSections.pharmacies);
                    toggleSection('pharmacies');
                  }}
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
                            {editingUserId === pharmacy.id ? (
                              <input
                                className="text-sm border rounded px-2 py-1 w-1/2"
                                value={userEditForm.name}
                                onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                              />
                            ) : (
                              <h4 className="font-medium text-gray-800">{pharmacy.name || '名前未設定'}</h4>
                            )}
                            <span className="text-xs text-gray-500">{pharmacy.email}</span>
                          </div>
                          
                          {/* 店舗名 */}
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 mb-1">店舗名:</div>
                            {editingUserId === pharmacy.id ? (
                              <input
                                className="text-xs border rounded px-2 py-1 w-full"
                                placeholder="カンマ区切りで入力 (例: 渋谷,新宿)"
                                value={userEditForm.store_names}
                                onChange={(e) => setUserEditForm({ ...userEditForm, store_names: e.target.value })}
                              />
                            ) : (
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
                            )}
                          </div>
                          
                          {/* 店舗毎のNG薬剤師 */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">店舗毎NG薬剤師:</div>
                            {storeNgPharmacists[pharmacy.id] && storeNgPharmacists[pharmacy.id].length > 0 ? (
                              <div className="space-y-1">
                                {storeNgPharmacists[pharmacy.id].map((storeNg: any, idx: number) => {
                                  const pharmacist = userProfiles[storeNg.pharmacist_id];
                                  return (
                                    <div key={idx} className="text-xs">
                                      <span className="font-medium text-blue-600">{storeNg.store_name}:</span>
                                      <span className="ml-1 bg-red-100 text-red-800 px-2 py-1 rounded">
                                        {pharmacist?.name || pharmacist?.email || storeNg.pharmacist_id}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">なし</span>
                            )}
                          </div>
                          
                          {/* NGリスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬剤師:</div>
                            {editingUserId === pharmacy.id ? (
                              <div className="text-xs">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {Object.entries(userProfiles)
                                    .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacist')
                                    .map(([id, profile]: [string, any]) => {
                                      const checked = userEditForm.ng_list.includes(id);
                                      return (
                                        <label key={id} className="inline-flex items-center gap-1 border rounded px-2 py-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="accent-red-600"
                                            checked={checked}
                                            onChange={(e) => {
                                              const next = new Set<string>(userEditForm.ng_list);
                                              if (e.target.checked) next.add(id); else next.delete(id);
                                              setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                            }}
                                          />
                                          <span>{(profile as any).name || (profile as any).email || id}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </div>
                            ) : (
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
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {editingUserId === pharmacy.id ? (
                              <>
                                <button onClick={() => saveEditUser(pharmacy)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                                <button onClick={() => setEditingUserId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => {
                                  console.log('Edit button clicked for pharmacy:', pharmacy.id);
                                  beginEditUser(pharmacy);
                                }} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                                <button onClick={() => {
                                  console.log('Delete button clicked for pharmacy:', pharmacy);
                                  alert('削除ボタンがクリックされました: ' + (pharmacy.name || pharmacy.email));
                                  deleteUser(pharmacy);
                                }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                              </>
                            )}
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
                            {editingUserId === pharmacist.id ? (
                              <input
                                className="text-sm border rounded px-2 py-1 w-1/2"
                                value={userEditForm.name}
                                onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                              />
                            ) : (
                              <h4 className="font-medium text-gray-800">{pharmacist.name || '名前未設定'}</h4>
                            )}
                            <span className="text-xs text-gray-500">{pharmacist.email}</span>
                          </div>
                          
                          {/* NGリスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬局:</div>
                            {editingUserId === pharmacist.id ? (
                              <div className="space-y-2">
                                {Object.entries(userProfiles)
                                  .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy')
                                  .map(([id, profile]: [string, any]) => {
                                    const checked = userEditForm.ng_list.includes(id);
                                    return (
                                      <label key={id} className="inline-flex items-center gap-1 border rounded px-2 py-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="accent-red-600"
                                          checked={checked}
                                          onChange={(e) => {
                                            const next = new Set<string>(userEditForm.ng_list);
                                            if (e.target.checked) next.add(id); else next.delete(id);
                                            setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                          }}
                                        />
                                        <span>{(profile as any).name || (profile as any).email || id}</span>
                                      </label>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-sm">
                                {(() => {
                                  // ng_listを確実に配列として処理
                                  let ngList: string[] = [];
                                  if (Array.isArray(pharmacist.ng_list)) {
                                    ngList = pharmacist.ng_list.filter(id => id && id.trim());
                                  } else if (typeof pharmacist.ng_list === 'string' && pharmacist.ng_list.trim()) {
                                    ngList = pharmacist.ng_list.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                  }
                                  
                                  if (ngList.length === 0) {
                                    return <span className="text-gray-500">なし</span>;
                                  }
                                  
                                  return (
                                    <div className="flex flex-wrap gap-1">
                                      {ngList.map((ngId: string, idx: number) => {
                                        // 薬局名を取得する関数 - 直接的な解決
                                        const getPharmacyName = (id: string) => {
                                          // 1. 直接userProfilesから検索
                                          const profile = userProfiles[id];
                                          if (profile && profile.name) {
                                            return profile.name;
                                          }
                                          
                                          // 2. 全プロファイルから検索
                                          for (const [profileId, profileData] of Object.entries(userProfiles)) {
                                            if (profileId === id && (profileData as any).name) {
                                              return (profileData as any).name;
                                            }
                                          }
                                          
                                          // 3. 見つからない場合は、IDの最初の8文字を表示
                                          return `薬局ID: ${id.slice(0, 8)}...`;
                                        };
                                        
                                        const pharmacyName = getPharmacyName(ngId);
                                        
                                        return (
                                          <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                            {pharmacyName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {editingUserId === pharmacist.id ? (
                              <>
                                <button onClick={() => saveEditUser(pharmacist)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                                <button onClick={() => setEditingUserId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => beginEditUser(pharmacist)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                                <button onClick={() => {
                                  console.log('Delete button clicked for pharmacist:', pharmacist);
                                  alert('削除ボタンがクリックされました: ' + (pharmacist.name || pharmacist.email));
                                  deleteUser(pharmacist);
                                }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                              </>
                            )}
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
