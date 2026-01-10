import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Sun, Smile, Lock } from 'lucide-react';
import { shiftRequests, systemStatus, supabase, storeNgPharmacies } from '../lib/supabase';
import PasswordChangeModal from './PasswordChangeModal';
import { extractStoreName, getTimeDisplay } from '../utils/storeUtils';
import { isValidLength, sanitizeTextInput } from '../utils/validation';
import { safeGetLocalStorageJSON, safeSetLocalStorageJSON } from '../utils/storage';
import type {
  AuthUser,
  AssignedShift,
  PharmacistRequest,
  UserProfile,
  TimeTemplate
} from '../types';

interface PharmacistDashboardProps {
  user: AuthUser;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempSelectedDate, setTempSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [, setIsSystemConfirmed] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(true);

  // 定型時間テンプレート
  const [savedTimeTemplates, setSavedTimeTemplates] = useState<TimeTemplate[]>([]);

  // プロフィール編集用のstate
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [nearestStationName, setNearestStationName] = useState('');

  // パスワード変更モーダル表示状態
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

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
  const logToRailway = (message: string, data?: unknown) => {
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
  const [myShifts, setMyShifts] = useState<AssignedShift[]>([]);
  const [myRequests, setMyRequests] = useState<PharmacistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPharmacies, setAllPharmacies] = useState<UserProfile[]>([]);
  // NG設定関連のUIは管理画面のみ。値の読み込みは残すが、編集UIは表示しない。
  const [ngList, setNgList] = useState<string[]>([]);
  const [storeNgLists, setStoreNgLists] = useState<{[pharmacyId: string]: {[storeName: string]: boolean}}>({});
  // NG設定UI用の変数（非表示だが参照エラー回避のため残す）
  const [selectedPharmacyForNg] = useState('');
  const [selectedStoreForNg, setSelectedStoreForNg] = useState('');
  const [] = useState<string[]>([]);
  const [selectedNgPharmacyId, setSelectedNgPharmacyId] = useState('');

  // 画面内デバッグ表示切替（?debug=1）
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';


  useEffect(() => {
    // 常時可視ログ（error レベル）
    try {
      console.error('[PD] PharmacistDashboard mounted', { userId: user?.id });
    } catch (error) {
      console.error('[PD] Failed to log mount event:', error);
    }
    loadShifts();
    checkRecruitmentStatus();

    // 定型時間テンプレートをlocalStorageから読み込み
    try {
      const saved = safeGetLocalStorageJSON<TimeTemplate[]>(`time_templates_${user?.id || ''}`);
      if (saved) {
        setSavedTimeTemplates(saved);
      }
    } catch (e) {
      console.error('Failed to load time templates:', e);
    }
  }, [user]);

  // 定型時間テンプレートを保存
  const saveTimeTemplate = () => {
    if (!startTime || !endTime) {
      alert('開始時間と終了時間を入力してください');
      return;
    }
    if (startTime >= endTime) {
      alert('開始時間は終了時間より早く設定してください');
      return;
    }

    // 時間帯をテンプレート名として使用
    const templateName = `${startTime}-${endTime}`;

    const newTemplate = {
      name: templateName,
      start: startTime,
      end: endTime
    };

    const updated = [...savedTimeTemplates, newTemplate];
    setSavedTimeTemplates(updated);

    safeSetLocalStorageJSON(`time_templates_${user?.id || ''}`, updated);

    alert('定型時間を保存しました');
  };

  const deleteTimeTemplate = (index: number) => {
    if (!confirm('この定型時間を削除しますか？')) return;

    const updated = savedTimeTemplates.filter((_, i) => i !== index);
    setSavedTimeTemplates(updated);

    safeSetLocalStorageJSON(`time_templates_${user?.id || ''}`, updated);
  };

  const applyTimeTemplate = (template: {name: string, start: string, end: string}) => {
    setStartTime(template.start);
    setEndTime(template.end);
  };

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
        console.log('募集状況チェック結果:', { is_open: data.is_open, current: isRecruitmentOpen });
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
    const intervalId = window.setInterval(checkRecruitmentStatus, 30000); // 30秒ごとにチェック（サーバー負荷軽減）
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, []);

  // デバッグ用: 状態の変更を監視
  useEffect(() => {
    logToRailway('State changed', {
      selectedDates,
      startTime,
      endTime
    });
  }, [selectedDates, startTime, endTime]);



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
        setMyShifts([]);
      } else {
        console.log('Loaded assigned shifts:', assignedData);
        try {
          console.error('[PD] Loaded assigned_shifts', {
            count: assignedData?.length || 0,
            ids: (assignedData || []).map((s: AssignedShift) => s.id).slice(0, 10),
          });
        } catch (error) {
          console.error('[PD] Failed to log assigned_shifts:', error);
        }
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
            status: r.status
          })));
        }
        
        // 確定済みステータスの希望を除外
        const filteredRequests = (reqs || []).filter((request: any) => {
          return request.status !== 'confirmed';
        });
        
        console.log(`薬剤師ダッシュボード: 全希望${reqs?.length || 0}件 → 表示${filteredRequests.length}件`);
        setMyRequests(filteredRequests);
      }
      
      // ユーザープロフィールを取得
      console.log('=== PHARMACIST PROFILE FETCH ===');
      console.log('Auth user:', authUser);
      console.log('User ID to use:', userIdToUse);
      console.log('Auth user ID:', authUser?.id);
      console.log('User ID from props:', user.id);
      console.log('IDs match:', authUser?.id === user.id);
      
      let { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userIdToUse)
        .single();
      
      console.log('Pharmacist profile query result:');
      console.log('- Data:', profileData);
      console.log('- Error:', profileError);
      console.log('- Error code:', profileError?.code);
      
      // プロフィールレコードが存在しない場合（PGRST116エラー）は作成する
      if (profileError?.code === 'PGRST116') {
        console.log('Pharmacist profile record does not exist, creating one...');
        try {
          const newProfileData = {
            id: userIdToUse,
            name: user.user_metadata?.name || user.email?.split('@')[0] || '薬剤師名未設定',
            email: user.email || '',
            user_type: 'pharmacist'
          };
          
          console.log('Creating pharmacist profile with data:', newProfileData);
          
          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert(newProfileData)
            .select()
            .single();
          
          if (createError) {
            console.error('Failed to create pharmacist profile:', createError);
            profileData = null;
            profileError = createError;
          } else {
            console.log('Pharmacist profile created successfully:', createdProfile);
            profileData = createdProfile;
            profileError = null;
          }
        } catch (error) {
          console.error('Error creating pharmacist profile:', error);
          profileError = error;
        }
      }
      
      if (!profileError && profileData) {
        // プロフィール更新中でない場合のみ名前を設定
        if (!showProfileEdit) {
          setProfileName(profileData.name || '');
        }
        setNgList(profileData.ng_list || []);
        // LINE連携状態をチェック
        setIsLineLinked(!!profileData.line_user_id);
        
        // 名前がメールアドレスの@より前の部分の場合は、user_metadataから正しい名前を取得
        if (profileData.name === user.email?.split('@')[0] && user.user_metadata?.name) {
          console.log('名前をuser_metadataから更新:', user.user_metadata.name);
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ name: user.user_metadata.name })
            .eq('id', userIdToUse);
          
          if (!updateError && !showProfileEdit) {
            setProfileName(user.user_metadata.name);
          }
        }
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
      } catch (error) {
        console.error('Failed to load pharmacy list:', error);
        setAllPharmacies([]);
      }
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
        if (existingRequest.start_time && existingRequest.end_time) {
          setStartTime(String(existingRequest.start_time).substring(0, 5));
          setEndTime(String(existingRequest.end_time).substring(0, 5));
        } else {
          // 定型時間の場合は対応する時間を設定
          if (existingRequest.time_slot === 'morning' || existingRequest.time_slot === 'am') {
            setStartTime('09:00');
            setEndTime('13:00');
          } else if (existingRequest.time_slot === 'afternoon' || existingRequest.time_slot === 'pm') {
            setStartTime('13:00');
            setEndTime('18:00');
          } else if (existingRequest.time_slot === 'full' || existingRequest.time_slot === 'fullday') {
            setStartTime('09:00');
            setEndTime('18:00');
          }
        }
        setMemo(existingRequest.memo || '');
      } else {
        // 新しい日付の場合は時間帯をデフォルト値に設定
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
      
      // 更新前のデータベース状態を確認
      console.log('=== 更新前のデータベース状態確認 ===');
      const { data: beforeUpdate, error: beforeError } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type, created_at, updated_at')
        .eq('id', userIdToUse)
        .single();
      
      console.log('更新前のデータ:', beforeUpdate);
      console.log('更新前のエラー:', beforeError);
      
      // ユーザーIDの確認
      if (!userIdToUse) {
        console.error('User ID is missing!');
        alert('ユーザーIDが取得できません。ログインし直してください。');
        return;
      }
      
      // 現在のプロフィールデータを取得して、既存のデータを保持
      const { data: currentProfileData, error: currentProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userIdToUse)
        .single();
      
      if (currentProfileError) {
        console.error('Error fetching current profile:', currentProfileError);
        alert('現在のプロフィールデータの取得に失敗しました');
        return;
      }
      
      console.log('Current profile data:', currentProfileData);
      
      const updatePayload = {
        name: profileName || user.email || 'Unknown',
        ng_list: ngList,
        // 既存のnearest_station_nameを保持し、新しい値がある場合のみ更新
        nearest_station_name: nearestStationName && nearestStationName.trim() 
          ? nearestStationName 
          : (currentProfileData.nearest_station_name || null)
      };
      
      console.log('Update payload:', updatePayload);
      console.log('Profile name being sent:', profileName);
      console.log('User email fallback:', user.email);
      console.log('Final name value:', updatePayload.name);
      
      // 更新処理の前に、レコードが存在することを確認
      console.log('=== 更新前のレコード存在確認 ===');
      const { data: existenceCheck, error: existenceError } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .eq('id', userIdToUse)
        .single();
      
      console.log('Existence check result:', { data: existenceCheck, error: existenceError });
      
      if (existenceError) {
        console.error('❌ レコードが存在しません！', existenceError);
        alert('プロフィールレコードが見つかりません。データが削除されている可能性があります。');
        return;
      }
      
      console.log('✅ レコードが存在します:', existenceCheck);
      
      const { data: updateResult, error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', userIdToUse)
        .select('*');
      
      console.log('Update result:', { data: updateResult, error });
      console.log('Update result data:', updateResult);
      console.log('Update result error:', error);
      console.log('Update result length:', updateResult?.length);
      
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
        
        // 店舗毎NG薬局設定を保存（エラーが発生してもプロフィール更新は成功とする）
        try {
          const { error: storeNgError } = await storeNgPharmacies.updateStoreNgPharmacies(userIdToUse, storeNgLists);
          if (storeNgError) {
            console.error('Error updating store NG pharmacies:', storeNgError);
            console.log('Store NG pharmacies update failed, but profile update succeeded');
            // エラーが発生してもプロフィール更新は成功とする
          } else {
            console.log('Store NG pharmacies updated successfully');
          }
        } catch (storeNgException) {
          console.error('Exception updating store NG pharmacies:', storeNgException);
          console.log('Store NG pharmacies update failed, but profile update succeeded');
        }
        
        // 更新されたプロフィールデータを再取得してstateを更新
        console.log('Fetching updated profile data from DB...');
        const { data: updatedProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('name, ng_list')
          .eq('id', userIdToUse)
          .single();
        
        console.log('Re-fetch result:', { data: updatedProfile, error: fetchError });
        console.log('Re-fetch data:', updatedProfile);
        console.log('Re-fetch error:', fetchError);
        
        if (!fetchError && updatedProfile) {
          console.log('Updated profile data from DB:', updatedProfile);
          console.log('Updated name from DB:', updatedProfile.name);
          console.log('Name comparison - sent vs received:', {
            sent: updatePayload.name,
            received: updatedProfile.name,
            match: updatePayload.name === updatedProfile.name
          });
          setProfileName(updatedProfile.name || '');
          setNgList(updatedProfile.ng_list || []);
          console.log('Profile state updated with fresh data');
          console.log('Profile name state after update:', updatedProfile.name);
        } else {
          console.error('Failed to re-fetch updated profile:', fetchError);
        }
        
        setShowProfileEdit(false);
        // 成功時はローカルキャッシュも更新
        safeSetLocalStorageJSON(`ng_list_${user?.id || ''}`, ngList);
        
      // データベースの永続化を確認するため、少し時間を置いてから再度取得
      console.log('Waiting 2 seconds to verify database persistence...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Verifying database persistence...');
      const { data: persistenceCheck, error: persistenceError } = await supabase
        .from('user_profiles')
        .select('name, ng_list')
        .eq('id', userIdToUse)
        .single();
      
      console.log('Persistence check result:', { data: persistenceCheck, error: persistenceError });
      console.log('Persistence check data:', persistenceCheck);
      console.log('Persistence check error:', persistenceError);
      
      if (!persistenceError && persistenceCheck) {
        console.log('Database persistence verified:', {
          name: persistenceCheck.name,
          expected: updatePayload.name,
          match: persistenceCheck.name === updatePayload.name
        });
      } else {
        console.error('Database persistence check failed:', persistenceError);
      }
      
      // 追加の永続化確認：5秒後に再度チェック
      console.log('Waiting 5 seconds for additional persistence check...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { data: finalPersistenceCheck, error: finalPersistenceError } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type, created_at, updated_at')
        .eq('id', userIdToUse)
        .single();
      
      console.log('Final persistence check result:', { data: finalPersistenceCheck, error: finalPersistenceError });
      
      if (!finalPersistenceError && finalPersistenceCheck) {
        console.log('✅ Final database persistence verified:', {
          id: finalPersistenceCheck.id,
          name: finalPersistenceCheck.name,
          email: finalPersistenceCheck.email,
          user_type: finalPersistenceCheck.user_type,
          created_at: finalPersistenceCheck.created_at,
          updated_at: finalPersistenceCheck.updated_at
        });
      } else {
        console.error('❌ Final database persistence check failed:', finalPersistenceError);
      }
        
        // プロフィール更新後にデータを再読み込み
        console.log('Reloading profile data after update...');
        await loadShifts();
        
        // 最終的なデータベース状態を確認
        console.log('=== 最終的なデータベース状態確認 ===');
        const { data: finalCheck, error: finalError } = await supabase
          .from('user_profiles')
          .select('id, name, email, user_type, created_at, updated_at')
          .eq('id', userIdToUse)
          .single();
        
        console.log('最終的なデータ:', finalCheck);
        console.log('最終的なエラー:', finalError);
        
        if (finalCheck) {
          console.log('✅ データベースに正常に保存されました');
        } else {
          console.error('❌ データベースからデータが消失しています！');
        }
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
        safeSetLocalStorageJSON(`ng_list_${user?.id || ''}`, newNgList);
      }
      
      console.log('=== UPDATING NG LIST IN DATABASE END ===');
    } catch (error) {
      console.error('Error updating NG list:', error);
      alert('NG薬局の更新に失敗しました');
    }
  };

  const handleSubmit = async () => {
    console.log('PharmacistDashboard: handleSubmit called');
      console.log('Form data:', { selectedDates, startTime, endTime, userId: user.id });

    // 募集締切チェック
    if (!isRecruitmentOpen) {
      alert('現在募集は締め切られています。管理者にお問い合わせください。');
      return;
    }

    // 確定シフトがある日付をチェック
    const confirmedDates = selectedDates.filter(date =>
      myShifts.some((shift: any) => shift.date === date)
    );
    if (confirmedDates.length > 0) {
      alert(`以下の日付は既に確定しているため、希望を登録できません:\n${confirmedDates.join(', ')}`);
      return;
    }

    if (selectedDates.length === 0) {
      alert('日付を選択してください');
      return;
    }
    if (!startTime || !endTime) {
      alert('開始時間と終了時間を入力してください');
      return;
    }
    if (startTime >= endTime) {
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
        // DBの制約に合わせ、カスタム時間の場合も time_slot は 'fullday' を保存し、
        // 実際の時間は start_time/end_time で表現する
        time_slot: 'fullday',
        start_time: startTime + ':00',
        end_time: endTime + ':00',
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

    // 確定シフトがある日付をチェック
    const confirmedDates = selectedDates.filter(date =>
      myShifts.some((shift: any) => shift.date === date)
    );
    if (confirmedDates.length > 0) {
      alert(`以下の日付は既に確定しているため、希望を削除できません:\n${confirmedDates.join(', ')}`);
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
    { id: 'morning', label: '9:00-13:00', icon: Sun, color: 'bg-green-500 hover:bg-green-600' },
    { id: 'afternoon', label: '13:00-18:00', icon: Sun, color: 'bg-orange-500 hover:bg-orange-600' },
    { id: 'full', label: '9:00-18:00', icon: Smile, color: 'bg-yellow-500 hover:bg-yellow-600' }
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
    <div className="space-y-6 pb-20">
      {isDebug && (
        <div className="fixed right-2 top-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded">
          <div>PD debug</div>
          <div>user: {user?.id || 'N/A'}</div>
          <div>confirmed: {myShifts?.length || 0}</div>
        </div>
      )}

      {/* LINE連携機能は将来実装予定 */}

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
                    {/* 希望バッジを表示（募集締切でない限り、かつ確定していない場合のみ） */}
                    {isRecruitmentOpen && hasMyRequest(day) && !hasMyShift(day) && (
                      <div className="text-[9px] sm:text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 mt-1 inline-block">
                        <span className="sm:hidden">希</span>
                        <span className="hidden sm:inline">希望</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右側: シフト希望登録フォーム */}
        <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow mb-8">
                      <div className="p-4 lg:p-6 pb-20">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-3">
                シフト希望登録
              </h2>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setShowProfileEdit(!showProfileEdit)}
                  className="text-sm text-blue-600 hover:text-blue-800 text-left"
                >
                  プロフィール編集
                </button>
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-left"
                >
                  <Lock className="w-3 h-3" />
                  <span>パスワード変更</span>
                </button>
              </div>
            </div>
            
            {/* プロフィール編集フォーム */}
            {showProfileEdit && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">名前の設定</h3>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="あなたの名前"
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

                {/* 更新ボタン */}
                <div className="pt-2">
                  <button
                    onClick={handleProfileUpdate}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    更新
                  </button>
                </div>

              </div>
            )}
            
            {/* 確定シフトの詳細表示 */}
            {selectedDates.length > 0 && myShifts.length > 0 && (
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
                    
                    // ユーティリティ関数を使用して店舗名と時間を取得
                    const fallbackName = pharmacyProfile?.name || '薬局名未設定';
                    const storeName = extractStoreName(shift, fallbackName);
                    const timeDisplay = getTimeDisplay(shift);

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
                          時間: {timeDisplay}
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
                  希望時間: {(() => {
                    // 選択された日付の既存の希望データを取得
                    const existingRequest = myRequests.find((req: any) => 
                      selectedDates.includes(req.date)
                    );
                    
                    // 既存の希望データがある場合は、データベースのstart_timeとend_timeを使用
                    if (existingRequest) {
                      if (existingRequest.start_time && existingRequest.end_time) {
                        return `${existingRequest.start_time.slice(0,5)}-${existingRequest.end_time.slice(0,5)}`;
                      }
                      // start_timeとend_timeがない場合はtime_slotから判定
                      const timeSlot = existingRequest.time_slot;
                      if (timeSlot === 'morning' || timeSlot === 'am') {
                        return '9:00-13:00';
                      }
                      if (timeSlot === 'afternoon' || timeSlot === 'pm') {
                        return '13:00-18:00';
                      }
                      if (timeSlot === 'full' || timeSlot === 'fullday') {
                        return '9:00-18:00';
                      }
                      if (timeSlot === 'consult' || timeSlot === 'negotiable') {
                        return '9:00-18:00';
                      }
                      return timeSlot || '未設定';
                    }
                    
                    // 選択された時間を表示
                    return `${startTime}-${endTime}`;
                  })()}
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
                className="w-full mt-3 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                希望時間帯
              </label>

              {/* 定型時間テンプレート一覧 */}
              {savedTimeTemplates.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-2">定型時間から選択:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {savedTimeTemplates.map((template, index) => (
                      <div key={index} className="relative group">
                        <button
                          type="button"
                          onClick={() => applyTimeTemplate(template)}
                          className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
                        >
                          <div className="text-xs font-medium text-blue-800">{template.name}</div>
                          <div className="text-xs text-blue-600">{template.start} - {template.end}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTimeTemplate(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 時間入力 */}
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

              {/* 定型時間として保存ボタン */}
              <button
                type="button"
                onClick={saveTimeTemplate}
                className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                + この時間を定型時間として保存
              </button>
            </div>

            {/* 備考欄 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備考・コメント
              </label>
              <textarea
                value={memo}
                onChange={(e) => {
                  const value = e.target.value;
                  // サニタイズと最大500文字に制限
                  const sanitized = sanitizeTextInput(value, 500);
                  if (isValidLength(sanitized, 0, 500)) {
                    setMemo(sanitized);
                  }
                }}
                placeholder="例: 午後からの勤務希望、交通手段について等"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none ${
                  memo.length > 450 ? 'border-yellow-400' : 'border-gray-300'
                }`}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>応募時のコメントや希望条件を記入できます（管理画面で確認可能）</span>
                <span className={memo.length > 450 ? 'text-yellow-600 font-medium' : ''}>
                  {memo.length}/500文字
                </span>
              </div>
            </div>

            {/* 登録/削除ボタン */}
            {!isRecruitmentOpen ? (
              <div className="w-full py-3 px-4 rounded-lg bg-gray-400 text-white text-center font-medium text-sm sm:text-base break-words mt-4 mb-4">
                募集締切中のため編集できません
              </div>
            ) : (() => {
              // 選択された日付に既存の希望があるかチェック
              const hasExistingRequests = selectedDates.some(date =>
                myRequests.some((req: any) => req.date === date)
              );

              // 選択された日付に確定シフトがあるかチェック
              const hasConfirmedShifts = selectedDates.some(date =>
                myShifts.some((shift: any) => shift.date === date)
              );

              if (hasConfirmedShifts) {
                // 確定済みの日付がある場合は警告メッセージを表示
                return (
                  <div className="mt-4 mb-4 p-4 bg-green-50 border border-green-300 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800 mb-1">確定済みのシフト</p>
                        <p className="text-xs text-green-700">
                          選択された日付は既に確定済みです。確定済みのシフトは変更できません。
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (hasExistingRequests) {
                // 既存の希望がある場合は「希望を更新」と「希望を削除」の両方を表示
                return (
                  <div className="space-y-3 mt-4 mb-4">
                    <button
                      onClick={async () => {
                        // 既存の希望を更新
                        try {
                          const { data: { user: authUser } } = await supabase.auth.getUser();
                          const userIdToUse = authUser?.id || user.id;
                          // カスタム時間の場合も time_slot は 'fullday' を保存
                          const { error } = await shiftRequests.updateRequests({
                            pharmacist_id: userIdToUse,
                            dates: selectedDates,
                            time_slot: 'fullday',
                            start_time: `${startTime}:00`,
                            end_time: `${endTime}:00`,
                            memo: memo,
                          });
                          if (error) {
                            console.error('Error updating requests:', error);
                            alert(`希望の更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
                            return;
                          }
                          // UI リフレッシュ
                          await loadShifts();
                          alert('希望を更新しました');
                        } catch (e) {
                          console.error('Update existing requests failed:', e);
                          alert('希望の更新に失敗しました');
                        }
                      }}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700 text-sm sm:text-base"
                    >
                      希望を更新
                    </button>
                    <button
                      onClick={handleDeleteExistingRequests}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base"
                    >
                      希望を削除
                    </button>
                  </div>
                );
              } else {
                // 既存の希望がない場合は「希望を追加」のみ表示
                return (
                  <div className="mt-4 mb-4">
                    <button
                      onClick={handleSubmit}
                      disabled={!isRecruitmentOpen}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                        isRecruitmentOpen 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                    >
                      {isRecruitmentOpen ? '希望を追加' : '募集締切中'}
                    </button>
                  </div>
                );
              }
            })()}

            {/* 情報ボックス */}
            {/* 管理画面のみ許可: NG設定UIは非表示（この情報ブロックはそのまま） */}
            <div className="mt-4 mb-8 p-4 bg-blue-50 rounded-lg">
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

      {/* パスワード変更モーダル */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
        user={user}
      />
    </div>
  );
};

export default PharmacistDashboard;
