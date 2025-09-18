import React, { useState, useEffect } from 'react';

import { Calendar, AlertCircle, Star } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, supabase, pharmacistRatings } from '../lib/supabase';

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
  const [ratings, setRatings] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pharmacies: false,
    pharmacists: false
  });

  // 薬剤師の評価を取得する関数
  const getPharmacistRating = (pharmacistId: string) => {
    const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacistId);
    if (pharmacistRatings.length === 0) return 0;
    
    const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length;
    return Math.round(average * 10) / 10; // 小数点第1位まで
  };

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
    
    let ngList: string[] = [];
    if (profile.user_type === 'pharmacist') {
      // 薬剤師の場合はstore_ng_pharmaciesから読み込み
      const ngPharmacies = storeNgPharmacists[profile.id] || [];
      const pharmacyGroups: {[pharmacyId: string]: string[]} = {};
      
      ngPharmacies.forEach((ngPharmacy: any) => {
        const pharmacyId = ngPharmacy.pharmacy_id;
        const storeName = ngPharmacy.store_name;
        
        if (!pharmacyGroups[pharmacyId]) {
          pharmacyGroups[pharmacyId] = [];
        }
        
        pharmacyGroups[pharmacyId].push(storeName);
      });
      
      // 薬局の全店舗がNGの場合は薬局IDのみ、一部店舗のみNGの場合は店舗指定
      Object.entries(pharmacyGroups).forEach(([pharmacyId, stores]) => {
        const pharmacyProfile = userProfiles[pharmacyId];
        const allStoreNames = pharmacyProfile?.store_names || ['本店'];
        
        // 全店舗がNGに含まれているかチェック
        const allStoresInNg = allStoreNames.every(storeName => stores.includes(storeName));
        
        if (allStoresInNg && stores.length === allStoreNames.length) {
          // 全店舗がNGの場合
          ngList.push(pharmacyId);
        } else {
          // 一部店舗のみNGの場合は店舗指定
          stores.forEach(store => {
            ngList.push(`${pharmacyId}_${store}`);
          });
        }
      });
    } else if (profile.user_type === 'pharmacy') {
      // 薬局の場合はstore_ng_pharmacistsから読み込み
      const ngPharmacists = storeNgPharmacists[profile.id] || [];
      const pharmacistIds = new Set<string>();
      
      ngPharmacists.forEach((ngPharmacist: any) => {
        pharmacistIds.add(ngPharmacist.pharmacist_id);
      });
      
      ngList = Array.from(pharmacistIds);
    } else {
      // その他の場合は従来通り
      ngList = Array.isArray(profile.ng_list) ? [...profile.ng_list] : [];
    }
    
    setUserEditForm({
      name: profile.name || '',
      store_names: Array.isArray(profile.store_names) ? profile.store_names.join(',') : '',
      ng_list: ngList
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

      // 薬剤師の場合、NG薬局設定をstore_ng_pharmaciesテーブルに保存
      if (profile.user_type === 'pharmacist') {
        // 既存のNG薬局設定を削除
        console.log('既存NG薬局設定を削除中...', profile.id);
        const { error: deleteError } = await supabase
          .from('store_ng_pharmacies')
          .delete()
          .eq('pharmacist_id', profile.id);

        if (deleteError) {
          console.error('既存NG薬局設定の削除エラー:', deleteError);
          alert(`既存NG薬局設定の削除に失敗しました: ${deleteError.message}`);
          return;
        }
        console.log('既存NG薬局設定の削除完了');

        // 新しいNG薬局設定を追加
        const ngList = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

        if (ngList.length > 0) {
          const ngEntries = [];
          const seenEntries = new Set<string>();
          
          for (const ngId of ngList) {
            if (ngId.includes('_')) {
              // 店舗指定の場合 (pharmacyId_storeName)
              const [pharmacyId, storeName] = ngId.split('_');
              const entryKey = `${profile.id}_${pharmacyId}_${storeName}`;
              
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                ngEntries.push({
                  pharmacist_id: profile.id,
                  pharmacy_id: pharmacyId,
                  store_name: storeName
                });
              }
            } else {
              // 薬局全体の場合 - 全店舗を個別に保存
              const pharmacyProfile = userProfiles[ngId];
              const storeNames = pharmacyProfile?.store_names || ['本店'];
              
              storeNames.forEach((storeName: string) => {
                const entryKey = `${profile.id}_${ngId}_${storeName}`;
                
                if (!seenEntries.has(entryKey)) {
                  seenEntries.add(entryKey);
                  ngEntries.push({
                    pharmacist_id: profile.id,
                    pharmacy_id: ngId,
                    store_name: storeName
                  });
                }
              });
            }
          }

          if (ngEntries.length > 0) {
            console.log('保存するNG薬局エントリ:', ngEntries);
            const { error: insertError } = await supabase
              .from('store_ng_pharmacies')
              .insert(ngEntries);

            if (insertError) {
              console.error('NG薬局設定の保存エラー:', insertError);
              alert(`NG薬局設定の保存に失敗しました: ${insertError.message}`);
              return;
            }
          }
        }
      } else if (profile.user_type === 'pharmacy') {
        // 薬局の場合、NG薬剤師設定をstore_ng_pharmacistsテーブルに保存
        // 既存のNG薬剤師設定を削除
        console.log('既存NG薬剤師設定を削除中...', profile.id);
        const { error: deleteError } = await supabase
          .from('store_ng_pharmacists')
          .delete()
          .eq('pharmacy_id', profile.id);

        if (deleteError) {
          console.error('既存NG薬剤師設定の削除エラー:', deleteError);
          alert(`既存NG薬剤師設定の削除に失敗しました: ${deleteError.message}`);
          return;
        }
        console.log('既存NG薬剤師設定の削除完了');

        // 新しいNG薬剤師設定を追加
        const ngList = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

        if (ngList.length > 0) {
          const ngEntries = [];
          const seenEntries = new Set<string>();
          const storeNames = profile.store_names || ['本店'];
          
          for (const ngId of ngList) {
            for (const storeName of storeNames) {
              const entryKey = `${profile.id}_${storeName}_${ngId}`;
              
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                ngEntries.push({
                  pharmacy_id: profile.id,
                  store_name: storeName,
                  pharmacist_id: ngId
                });
              }
            }
          }

          if (ngEntries.length > 0) {
            console.log('保存するNG薬剤師エントリ:', ngEntries);
            const { error: insertError } = await supabase
              .from('store_ng_pharmacists')
              .insert(ngEntries);

            if (insertError) {
              console.error('NG薬剤師設定の保存エラー:', insertError);
              alert(`NG薬剤師設定の保存に失敗しました: ${insertError.message}`);
              return;
            }
          }
        }
      } else {
        // その他の場合は従来通りng_listを保存
        updates.ng_list = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        alert(`ユーザー更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }
      setEditingUserId(null);
      console.log('ユーザー情報を保存しました。データを再読み込み中...');
      await loadAll();
      console.log('データ再読み込み完了');
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
    console.log('useEffectが実行されました - loadAllを開始します');
    
    // クリーンアップ実行フラグをリセット
    (window as any).cleanupExecuted = false;
    
    loadAll();
  }, [user]); // currentDateを依存配列から削除

  // 名称未設定のデータを自動クリーンアップする関数
  const cleanupUndefinedData = async () => {
    try {
      console.log('=== データクリーンアップ開始 ===');
      console.log('クリーンアップ関数が呼び出されました');
      
      // 1. 名称未設定の薬剤師・薬局を特定（複数の検索条件を試行）
      console.log('ユーザープロフィールの検索を開始します...');
      
      // 条件1: 基本的な未設定条件
      const { data: undefinedUsers1, error: undefinedUsersError1 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.is.null,name.eq.,name.eq.undefined,email.is.null,email.eq.,email.eq.undefined');
      
      // 条件2: 未設定を含む条件
      const { data: undefinedUsers2, error: undefinedUsersError2 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.like.%未設定%,name.like.%薬剤師未設定%,name.like.%薬局未設定%');
      
      // 条件3: 薬剤師を含む条件
      const { data: undefinedUsers3, error: undefinedUsersError3 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.like.%薬剤師%');
      
      // 結果をマージ
      const allUndefinedUsers = [
        ...(undefinedUsers1 || []),
        ...(undefinedUsers2 || []),
        ...(undefinedUsers3 || [])
      ];
      
      // 重複を除去
      const uniqueUndefinedUsers = allUndefinedUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      console.log('条件1の結果:', undefinedUsers1);
      console.log('条件2の結果:', undefinedUsers2);
      console.log('条件3の結果:', undefinedUsers3);
      console.log('マージ後の結果:', uniqueUndefinedUsers);
      
      const undefinedUsers = uniqueUndefinedUsers;
      const undefinedUsersError = undefinedUsersError1 || undefinedUsersError2 || undefinedUsersError3;
      
      console.log('ユーザープロフィール検索結果:', { undefinedUsers, undefinedUsersError });
      
      // デバッグ用：すべてのユーザープロフィールを取得
      const { data: allUsers } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .limit(50);
      
      console.log('すべてのユーザープロフィール（最初の50件）:', allUsers);
      
      // 特に「薬剤師未設定」を含むデータを詳しく調査
      const pharmacistUsers = allUsers?.filter(user => 
        user.name && (
          user.name.includes('薬剤師') || 
          user.name.includes('未設定') ||
          user.name.includes('undefined') ||
          user.name === '' ||
          user.name === null
        )
      ) || [];
      
      console.log('薬剤師関連のユーザー:', pharmacistUsers);
      
      if (undefinedUsersError) {
        console.error('未設定ユーザーの取得エラー:', undefinedUsersError);
        return; // エラーでも処理を続行
      }
      
      console.log('名称未設定のユーザー:', undefinedUsers);
      
      // 2. 名称未設定のシフト募集を特定（より包括的な条件）
      const { data: undefinedPostings, error: undefinedPostingsError } = await supabase
        .from('shift_postings')
        .select('id, pharmacy_id, store_name, date, time_slot')
        .or('store_name.is.null,store_name.eq.,store_name.like.%未設定%,store_name.like.%薬局未設定%,store_name.like.%薬剤師未設定%,store_name.eq.undefined,store_name.like.%undefined%');
      
      if (undefinedPostingsError) {
        console.error('未設定募集の取得エラー:', undefinedPostingsError);
        return; // エラーでも処理を続行
      }
      
      console.log('名称未設定の募集:', undefinedPostings);
      
      // 3. 名称未設定のシフト希望も特定
      console.log('シフト希望の検索を開始します...');
      const { data: undefinedRequests, error: undefinedRequestsError } = await supabase
        .from('shift_requests')
        .select('id, pharmacist_id, date, time_slot')
        .in('pharmacist_id', undefinedUsers?.map(user => user.id) || []);
      
      if (undefinedRequestsError) {
        console.error('未設定希望の取得エラー:', undefinedRequestsError);
      } else {
        console.log('名称未設定の希望:', undefinedRequests);
      }
      
      // デバッグ用：すべてのシフト希望を取得
      const { data: allRequests } = await supabase
        .from('shift_requests')
        .select('id, pharmacist_id, date, time_slot')
        .limit(50);
      
      console.log('すべてのシフト希望（最初の50件）:', allRequests);
      
      // シフト希望とユーザープロフィールを結合して調査
      if (allRequests && allUsers) {
        const requestsWithUserInfo = allRequests.map(request => {
          const user = allUsers.find(u => u.id === request.pharmacist_id);
          return {
            ...request,
            user_name: user?.name || 'ユーザー未発見',
            user_email: user?.email || 'メール未発見',
            user_type: user?.user_type || 'タイプ未発見'
          };
        });
        
        console.log('シフト希望とユーザー情報の結合結果:', requestsWithUserInfo);
        
        // 「薬剤師未設定」に関連するシフト希望を特定
        const undefinedRequests = requestsWithUserInfo.filter(request => 
          request.user_name.includes('薬剤師未設定') ||
          request.user_name.includes('未設定') ||
          request.user_name === 'ユーザー未発見' ||
          request.user_name === '' ||
          request.user_name === null
        );
        
        console.log('未設定関連のシフト希望:', undefinedRequests);
      }
      
      // 4. 削除対象のIDを収集
      const userIdsToDelete = undefinedUsers?.map(user => user.id) || [];
      const postingIdsToDelete = undefinedPostings?.map(posting => posting.id) || [];
      const requestIdsToDelete = undefinedRequests?.map(request => request.id) || [];
      
      console.log('削除対象ユーザーID:', userIdsToDelete);
      console.log('削除対象募集ID:', postingIdsToDelete);
      console.log('削除対象希望ID:', requestIdsToDelete);
      
      // 削除対象がない場合は処理を終了
      if (userIdsToDelete.length === 0 && postingIdsToDelete.length === 0 && requestIdsToDelete.length === 0) {
        console.log('検索条件による削除対象のデータはありません');
        
        // 手動で「薬剤師未設定」を直接検索・削除
        console.log('手動で「薬剤師未設定」を検索します...');
        const { data: manualUndefinedUsers } = await supabase
          .from('user_profiles')
          .select('id, name, email, user_type')
          .eq('name', '薬剤師未設定');
        
        console.log('手動検索結果:', manualUndefinedUsers);
        
        if (manualUndefinedUsers && manualUndefinedUsers.length > 0) {
          console.log('手動検索で「薬剤師未設定」を発見しました。削除を実行します...');
          
          // 関連するシフト希望を削除
          for (const user of manualUndefinedUsers) {
            const { error: deleteRequestsError } = await supabase
              .from('shift_requests')
              .delete()
              .eq('pharmacist_id', user.id);
            
            if (deleteRequestsError) {
              console.error('シフト希望削除エラー:', deleteRequestsError);
            } else {
              console.log(`ユーザー ${user.id} のシフト希望を削除しました`);
            }
          }
          
          // ユーザーを削除
          const { error: deleteUsersError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('name', '薬剤師未設定');
          
          if (deleteUsersError) {
            console.error('ユーザー削除エラー:', deleteUsersError);
          } else {
            console.log(`${manualUndefinedUsers.length}件の「薬剤師未設定」ユーザーを削除しました`);
            // 削除後にデータを再読み込み
            await loadAll();
          }
        } else {
          console.log('手動検索でも「薬剤師未設定」は見つかりませんでした');
        }
        
        return;
      }
      
      // 5. 関連データを削除（外部キー制約のため順序が重要）
      let deletedCount = 0;
      
      // シフト募集を削除
      if (postingIdsToDelete.length > 0) {
        const { error: deletePostingsError } = await supabase
          .from('shift_postings')
          .delete()
          .in('id', postingIdsToDelete);
        
        if (deletePostingsError) {
          console.error('募集削除エラー:', deletePostingsError);
        } else {
          deletedCount += postingIdsToDelete.length;
          console.log(`${postingIdsToDelete.length}件の募集を削除しました`);
        }
      }
      
      // シフト希望を削除（直接IDで削除）
      if (requestIdsToDelete.length > 0) {
        const { error: deleteRequestsError } = await supabase
          .from('shift_requests')
          .delete()
          .in('id', requestIdsToDelete);
        
        if (deleteRequestsError) {
          console.error('希望削除エラー:', deleteRequestsError);
        } else {
          deletedCount += requestIdsToDelete.length;
          console.log(`${requestIdsToDelete.length}件の希望を削除しました`);
        }
      }
      
      // 薬剤師IDでシフト希望を削除（追加の安全措置）
      if (userIdsToDelete.length > 0) {
        const { error: deleteRequestsByUserError } = await supabase
          .from('shift_requests')
          .delete()
          .in('pharmacist_id', userIdsToDelete);
        
        if (deleteRequestsByUserError) {
          console.error('薬剤師IDによる希望削除エラー:', deleteRequestsByUserError);
        } else {
          console.log('薬剤師IDによる関連シフト希望を削除しました');
        }
      }
      
      // 確定シフトを削除
      if (userIdsToDelete.length > 0) {
        const { error: deleteAssignedError } = await supabase
          .from('assigned_shifts')
          .delete()
          .or(`pharmacist_id.in.(${userIdsToDelete.join(',')}),pharmacy_id.in.(${userIdsToDelete.join(',')})`);
        
        if (deleteAssignedError) {
          console.error('確定シフト削除エラー:', deleteAssignedError);
        } else {
          console.log('関連する確定シフトを削除しました');
        }
      }
      
      // ユーザープロフィールを削除
      if (userIdsToDelete.length > 0) {
        const { error: deleteUsersError } = await supabase
          .from('user_profiles')
          .delete()
          .in('id', userIdsToDelete);
        
        if (deleteUsersError) {
          console.error('ユーザー削除エラー:', deleteUsersError);
        } else {
          deletedCount += userIdsToDelete.length;
          console.log(`${userIdsToDelete.length}件のユーザーを削除しました`);
        }
      }
      
      console.log(`=== クリーンアップ完了: 合計${deletedCount}件削除 ===`);
      
      // 削除後にデータを再読み込み
      if (deletedCount > 0) {
        console.log('データ削除後、再読み込みを実行します...');
        await loadAll();
        console.log('再読み込みが完了しました');
      }
      
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  };

  const loadAll = async () => {
    try {
      console.log('🚀🚀🚀 ADMIN DASHBOARD loadAll STARTED 🚀🚀🚀');
      console.log('=== loadAll started - データ読み込み開始 ===');
      console.log('現在の日時:', new Date().toISOString());
      console.log('loadAll関数が実行されました - コンソールを確認してください');
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
      logToRailway('Attempting to load all assigned shifts...');
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      
      if (assignedError) {
        logToRailway('Error loading assigned shifts:', {
          error: assignedError,
          code: assignedError.code,
          message: assignedError.message,
          details: assignedError.details,
          hint: assignedError.hint
        });
        setAssigned([]);
      } else {
        logToRailway('Loaded assigned shifts:', assignedData);
        setAssigned(assignedData || []);
      }
      
      const { data: r } = await shiftRequests.getRequests('', 'admin' as any);
      setRequests(r || []);
      
      console.log('=== シフト希望データ読み込み完了 ===');
      console.log('読み込まれたシフト希望数:', (r || []).length);
      console.log('シフト希望の薬剤師ID一覧:', (r || []).map(req => req.pharmacist_id));
      console.log('シフト希望詳細:', r);
      
      const { data: p } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(p || []);
      
      console.log('=== 全データ読み込み完了 ===');
      console.log('ユーザープロフィール数:', Object.keys(userProfiles).length);
      console.log('シフト募集数:', (p || []).length);
      console.log('シフト希望数:', (r || []).length);
      console.log('確定シフト数:', (assignedData || []).length);
      
      // マッチング機能で使用されるテーブルの存在確認
      logToRailway('=== マッチング機能テーブル確認 ===');
      try {
        const { error: storeOpeningsError } = await supabase
          .from('store_openings')
          .select('count')
          .limit(1);
        logToRailway('store_openings table check:', { exists: !storeOpeningsError, error: storeOpeningsError });
      } catch (error) {
        logToRailway('store_openings table check failed:', error);
      }
      
      try {
        const { error: availabilitiesError } = await supabase
          .from('availabilities')
          .select('count')
          .limit(1);
        logToRailway('availabilities table check:', { exists: !availabilitiesError, error: availabilitiesError });
      } catch (error) {
        logToRailway('availabilities table check failed:', error);
      }
      
      try {
        const { error: matchesError } = await supabase
          .from('matches')
          .select('count')
          .limit(1);
        logToRailway('matches table check:', { exists: !matchesError, error: matchesError });
      } catch (error) {
        logToRailway('matches table check failed:', error);
      }
      
      logToRailway('=== マッチング機能テーブル確認終了 ===');
      
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
               const { data: appUsersData } = await supabase
                 .from('app_users')
                 .select('*');
               
               if (!appUsersData) {
                 logToRailway('Error loading app_users: No data');
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
          console.log('=== userProfiles更新前のデバッグ ===');
          console.log('更新前のuserProfiles:', userProfiles);
          console.log('新しいprofilesMap:', profilesMap);
          setUserProfiles(profilesMap);
          console.log('=== userProfiles更新完了 ===');
          
          console.log('=== ユーザープロフィール読み込み完了 ===');
          console.log('読み込まれたユーザー数:', Object.keys(profilesMap).length);
          console.log('ユーザーID一覧:', Object.keys(profilesMap));
          console.log('ユーザープロフィール詳細:', profilesMap);

          // 評価データを取得
          logToRailway('Fetching pharmacist ratings...');
          const { data: ratingsData } = await pharmacistRatings.getRatings();
          if (ratingsData) {
            setRatings(ratingsData);
            logToRailway('Loaded pharmacist ratings:', ratingsData.length);
          }
          
          // 店舗毎のNG薬剤師データを取得
          logToRailway('Fetching store-specific NG pharmacists...');
          const storeNgDataMap: {[pharmacyId: string]: any[]} = {};
          
          // 薬局ユーザーのみを対象に店舗毎NG薬剤師を取得
          const pharmacyUsers = Object.values(profilesMap).filter((profile: any) => profile.user_type === 'pharmacy');
          for (const pharmacy of pharmacyUsers) {
            try {
              const { data: storeNgData, error: storeNgError } = await supabase
                .from('store_ng_pharmacists')
                .select('*')
                .eq('pharmacy_id', (pharmacy as any).id);
              
              if (!storeNgError && storeNgData) {
                storeNgDataMap[(pharmacy as any).id] = storeNgData;
              }
            } catch (error) {
              logToRailway(`Error fetching store NG pharmacists for ${(pharmacy as any).id}:`, error);
            }
          }
          
          setStoreNgPharmacists(storeNgDataMap);
          logToRailway('Store NG pharmacists data:', storeNgDataMap);
          
          // 薬剤師のNG薬局情報を読み込み
          logToRailway('Loading pharmacist NG pharmacies...');
          const pharmacistNgPharmaciesMap: {[pharmacistId: string]: any[]} = {};
          
          // 薬剤師ユーザーのみを対象にNG薬局情報を取得
          const pharmacistUsers = Object.values(profilesMap).filter((profile: any) => profile.user_type === 'pharmacist');
          for (const pharmacist of pharmacistUsers) {
            try {
              const { data: ngPharmaciesData, error: ngPharmaciesError } = await supabase
                .from('store_ng_pharmacies')
                .select('*')
                .eq('pharmacist_id', (pharmacist as any).id);
              
              if (!ngPharmaciesError && ngPharmaciesData) {
                pharmacistNgPharmaciesMap[(pharmacist as any).id] = ngPharmaciesData;
              }
            } catch (error) {
              logToRailway(`Error fetching NG pharmacies for pharmacist ${(pharmacist as any).id}:`, error);
            }
          }
          
          setStoreNgPharmacists(prev => ({
            ...prev,
            ...pharmacistNgPharmaciesMap
          }));
          logToRailway('Pharmacist NG pharmacies data:', pharmacistNgPharmaciesMap);
          
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
      
      // データ読み込み完了後に自動クリーンアップを実行（初回のみ）
      if (!(window as any).cleanupExecuted) {
        console.log('loadAll完了後、初回クリーンアップを開始します');
        (window as any).cleanupExecuted = true;
        await cleanupUndefinedData();
        console.log('初回クリーンアップ処理が完了しました');
      } else {
        console.log('クリーンアップは既に実行済みです');
      }
      
      // データ読み込み完了後に自動マッチングを実行
      console.log('=== 自動マッチング開始 ===');
      console.log('データ読み込み完了後の自動マッチングを実行します');
      console.log('現在のデータ:', { 
        requests: requests.length, 
        postings: postings.length, 
        assigned: assigned.length,
        userProfiles: Object.keys(userProfiles).length
      });
      
      // 自動マッチングは意図しない再確定を避けるため停止（必要時に手動実行）
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

  // 確定シフトのみを再読み込みする関数
  const loadAssignedShifts = async () => {
    try {
      const { data: assignedData, error: assignedError } = await shifts.getShifts('', 'admin' as any);
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setAssigned([]);
      } else {
        setAssigned(assignedData || []);
      }
    } catch (error) {
      console.error('Error in loadAssignedShifts:', error);
      setAssigned([]);
    }
  };

  const handleConfirmShiftsForDate = async (date: string) => {
    try {
      console.log('handleConfirmShiftsForDate called for date:', date);
      console.log('Current requests:', requests);
      console.log('Current postings:', postings);
      
      // 現在のユーザーIDを確認
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('Admin auth user:', authUser);
      console.log('Admin user prop:', user);
      
      // 指定日の希望シフトと募集シフトをマッチングして確定済みシフトを作成
      const confirmedShifts: any[] = [];
      
      // 指定日の希望シフトと募集シフトを取得
      const dayRequests = requests.filter((request: any) => request.date === date);
      const dayPostings = postings.filter((posting: any) => posting.date === date);
      
      console.log(`Processing date ${date}:`, { dayRequests, dayPostings });
      
      // 指定日のみを処理
      if (dayRequests.length > 0 || dayPostings.length > 0) {
        
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

        // 時刻範囲対応のマッチング関数（両者にstart_time/end_timeがあれば包含で判定）
        const isRangeCompatible = (request: any, posting: any, postSlot: string) => {
          const rs = request?.start_time;
          const re = request?.end_time;
          const ps = posting?.start_time;
          const pe = posting?.end_time;
          if (rs && re && ps && pe) {
            // 完全包含: 薬剤師の希望が薬局の募集時間をすべて覆う
            return rs <= ps && re >= pe;
          }
          // どちらか欠けていれば従来のスロット互換
          return isTimeCompatible(request?.time_slot, postSlot);
        };

        // この日付でマッチした薬剤師と薬局を追跡
        const matchedPharmacists: any[] = [];
        const matchedPharmacies: any[] = [];


        // 時間帯ごとにマッチング（完全一致を優先）
        const timeSlots = ['morning', 'afternoon', 'full'];
        
        // まず完全一致のマッチングを実行
        timeSlots.forEach((slot) => {
          const slotPostings = dayPostings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
          const slotRequests = dayRequests.filter((r: any) => r.time_slot === slot || (slot === 'full' && r.time_slot === 'fullday'));
          
          if (slotPostings.length === 0 || slotRequests.length === 0) return;
          
          // 薬剤師を評価と優先順位でソート（評価が高い順、同じ評価なら優先度順）
          const sortedRequests = slotRequests.sort((a: any, b: any) => {
            const aRating = getPharmacistRating(a.pharmacist_id);
            const bRating = getPharmacistRating(b.pharmacist_id);
            
            // 評価が異なる場合は評価の高い順
            if (aRating !== bRating) {
              return bRating - aRating;
            }
            
            // 評価が同じ場合は優先度順
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

              // 時間帯/時間範囲の互換性を考慮
              if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed, slot)) {
                // マッチング成功のログ
                if ((request.time_slot === 'full' || request.time_slot === 'fullday') && (slot === 'morning' || slot === 'afternoon')) {
                  console.log(`🎯 確定用マッチング: 終日希望薬剤師(${pharmacist?.name}) → ${slot}募集薬局(${pharmacy?.name})`);
                } else {
                  console.log(`✅ 確定用マッチング: 薬剤師(${pharmacist?.name}) ${request.time_slot} → 薬局(${pharmacy?.name}) ${slot}`);
                }
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
                  // IDはSupabaseが自動生成
                  pharmacist_id: request.pharmacist_id,
                  pharmacy_id: pharmacyNeed.pharmacy_id,
                  date: date,
                  time_slot: adjustedTimeSlot, // 薬局の募集時間帯を使用
                  start_time: pharmacyNeed.start_time || request.start_time || null,
                  end_time: pharmacyNeed.end_time || request.end_time || null,
                  status: 'confirmed',
                  store_name: storeName,
                  memo: pharmacyNeed.memo || ''
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
          const slotPostings = dayPostings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
          
          if (slotPostings.length === 0) return;
          
          // まだマッチしていない薬剤師を取得
          const unmatchedRequests = dayRequests.filter((req: any) => 
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

              // 柔軟な時間帯/時間範囲マッチングをチェック
              if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed, slot)) {
                // 柔軟なマッチング成功のログ
                if ((request.time_slot === 'full' || request.time_slot === 'fullday') && (slot === 'morning' || slot === 'afternoon')) {
                  console.log(`🎯 確定用柔軟マッチング: 終日希望薬剤師(${pharmacist?.name}) → ${slot}募集薬局(${pharmacy?.name})`);
                } else {
                  console.log(`✅ 確定用柔軟マッチング: 薬剤師(${pharmacist?.name}) ${request.time_slot} → 薬局(${pharmacy?.name}) ${slot}`);
                }
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
                  // IDはSupabaseが自動生成
                  pharmacist_id: request.pharmacist_id,
                  pharmacy_id: pharmacyNeed.pharmacy_id,
                  date: date,
                  time_slot: adjustedTimeSlot, // 薬局の募集時間帯を使用
                  start_time: pharmacyNeed.start_time || request.start_time || null,
                  end_time: pharmacyNeed.end_time || request.end_time || null,
                  status: 'confirmed',
                  store_name: storeName,
                  memo: pharmacyNeed.memo || ''
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
      }

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

      setLastUpdated(new Date());
      
      // 指定日のデータのみを再読み込み（全データの再読み込みは避ける）
      await loadAssignedShifts();
    } catch (error) {
      console.error('Error in handleConfirmShiftsForDate:', error);
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
    // start_time/end_time を time_slot から補完（将来: UIで直接入力できるように）
    const toRange = (slot: string) => {
      // Supabaseの time 型は HH:MM:SS を推奨
      if (slot === 'morning') return { start_time: '09:00:00', end_time: '13:00:00' };
      if (slot === 'afternoon') return { start_time: '13:00:00', end_time: '18:00:00' };
      return { start_time: '09:00:00', end_time: '18:00:00' };
    };
    const range = toRange(newRequest.time_slot);
    const payload = [{
      pharmacist_id: newRequest.pharmacist_id,
      date: selectedDate,
      time_slot: newRequest.time_slot,
      start_time: range.start_time,
      end_time: range.end_time,
      priority: newRequest.priority
    }];
    const { error } = await shiftRequests.createRequests(payload);
    if (error) {
      const e: any = error as any;
      alert(`希望の追加に失敗しました: ${e?.message || e?.code || 'Unknown error'}`);
      return;
    }
    setNewRequest({ pharmacist_id: '', time_slot: 'morning', priority: 'medium' });
    await loadAll();
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
      // 1) 対象日の確定シフトを取得（後で復元に利用）
      const { data: toCancel, error: fetchErr } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('date', date)
        .eq('status', 'confirmed');
      if (fetchErr) {
        console.error('Error fetching confirmed shifts before cancel:', fetchErr);
      }

      // 2) 事前に薬剤師希望/薬局募集を復元（存在しない場合のみ作成）
      if (toCancel && toCancel.length > 0) {
        for (const s of toCancel) {
          const pharmacistId = s.pharmacist_id;
          const pharmacyId = s.pharmacy_id;
          const timeSlot = s.time_slot || 'full';

          // 希望の復元（薬剤師）
          try {
            const { data: existingReq, error: findReqErr } = await supabase
              .from('shift_requests')
              .select('id')
              .eq('pharmacist_id', pharmacistId)
              .eq('date', date)
              .eq('time_slot', timeSlot)
              .limit(1);
            if (!findReqErr && (!existingReq || existingReq.length === 0)) {
              await supabase.from('shift_requests').insert({
                pharmacist_id: pharmacistId,
                date,
                time_slot: timeSlot,
                priority: 'medium'
              });
            }
          } catch (e) {
            console.error('restore request failed:', e);
          }

          // 募集の復元（薬局）: 同日の同時間帯の募集が無い場合に1名分を再作成
          try {
            const { data: existingPost, error: findPostErr } = await supabase
              .from('shift_postings')
              .select('id')
              .eq('pharmacy_id', pharmacyId)
              .eq('date', date)
              .eq('time_slot', timeSlot)
              .limit(1);
            if (!findPostErr && (!existingPost || existingPost.length === 0)) {
              await supabase.from('shift_postings').insert({
                pharmacy_id: pharmacyId,
                date,
                time_slot: timeSlot,
                required_staff: 1,
                store_name: s.store_name || null,
                memo: 'auto-restored after cancel'
              });
            }
          } catch (e) {
            console.error('restore posting failed:', e);
          }
        }
      }

      // 3) 確定シフトを削除
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
      
      // 全再読込だと自動マッチングが走るため、確定データのみ再取得
      await loadAssignedShifts();
    } catch (error) {
      console.error('Error in handleCancelConfirmedShifts:', error);
      alert(`確定シフトの取り消しに失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 全確定シフトの一括取り消し

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

  // 実際のマッチング処理を実行する関数
  const executeMatching = async () => {
    try {
      console.log('=== 実際のマッチング処理開始 ===');
      console.log('マッチング前の状態:', { 
        requests: requests.length, 
        postings: postings.length, 
        assigned: assigned.length,
        assignedDetails: assigned
      });
      
      // 日付ごとにマッチング処理を実行
      const dates = [...new Set([...requests.map(r => r.date), ...postings.map(p => p.date)])];
      console.log('マッチング対象日付:', dates);
      
      for (const date of dates) {
        console.log(`=== 日付 ${date} のマッチング処理 ===`);
        
        // その日の希望と募集を取得
        const dayRequests = requests.filter(r => r.date === date && r.time_slot !== 'consult');
        const dayPostings = postings.filter(p => p.date === date && p.time_slot !== 'consult');
        const dayAssigned = assigned.filter(a => a.date === date && a.status === 'confirmed');
        
        console.log(`日付 ${date}: 希望${dayRequests.length}件, 募集${dayPostings.length}件, 確定${dayAssigned.length}件`);
        
        if (dayRequests.length === 0 || dayPostings.length === 0) {
          console.log(`日付 ${date}: 希望または募集がないためスキップ`);
          continue;
        }
        
        // 既に確定済みの場合はスキップ
        if (dayAssigned.length > 0) {
          console.log(`日付 ${date}: 既に確定済みのためスキップ`);
          continue;
        }
        
        // マッチング処理を実行
        await performMatchingForDate(date, dayRequests, dayPostings);
      }
      
      console.log('=== 実際のマッチング処理完了 ===');
      
      // データを再読み込み
      await loadAll();
      
      // マッチング結果を確認
      console.log('=== マッチング結果確認 ===');
      console.log('更新後のデータ:', { 
        requests: requests.length, 
        postings: postings.length, 
        assigned: assigned.length 
      });
      
    } catch (error) {
      console.error('マッチング実行エラー:', error);
      throw error;
    }
  };

  // 特定の日付のマッチング処理を実行
  const performMatchingForDate = async (date: string, dayRequests: any[], dayPostings: any[]) => {
    console.log(`=== 日付 ${date} のマッチング実行 ===`);
    
    const timeSlots = ['morning', 'afternoon', 'full'];
    const matchedShifts: any[] = [];
    
    for (const slot of timeSlots) {
      console.log(`時間帯 ${slot} のマッチング処理開始`);
      
      const slotPostings = dayPostings.filter(p => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
      const slotRequests = dayRequests.filter(r => r.time_slot === slot || (slot === 'full' && r.time_slot === 'fullday'));
      
      if (slotPostings.length === 0 || slotRequests.length === 0) {
        console.log(`時間帯 ${slot}: 募集または希望がないためスキップ`);
        continue;
      }
      
      // 薬剤師を評価と優先順位でソート（評価が高い順、同じ評価なら優先度順）
      const sortedRequests = slotRequests.sort((a, b) => {
        const aRating = getPharmacistRating(a.pharmacist_id);
        const bRating = getPharmacistRating(b.pharmacist_id);
        
        // 評価が異なる場合は評価の高い順
        if (aRating !== bRating) {
          return bRating - aRating;
        }
        
        // 評価が同じ場合は優先度順
        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // 各薬局の必要人数を管理
      const pharmacyNeeds = slotPostings.map(p => ({
        ...p,
        remaining: Number(p.required_staff) || 0
      }));
      
      // マッチング処理
      for (const request of sortedRequests) {
        for (const pharmacyNeed of pharmacyNeeds) {
          if (pharmacyNeed.remaining <= 0) continue;
          
          // NGリストチェック
          const pharmacist = userProfiles[request.pharmacist_id];
          const pharmacy = userProfiles[pharmacyNeed.pharmacy_id];
          
          const pharmacistNg = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];
          const pharmacyNg = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];
          
          const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
          const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);
          
          // 時間帯互換性チェック
          const isTimeCompatible = (reqSlot: string, postSlot: string) => {
            if (reqSlot === postSlot) return true;
            if (reqSlot === 'full' || reqSlot === 'fullday') {
              return postSlot === 'morning' || postSlot === 'afternoon' || postSlot === 'full' || postSlot === 'fullday';
            }
            if (reqSlot === 'morning') {
              return postSlot === 'morning' || postSlot === 'full' || postSlot === 'fullday';
            }
            if (reqSlot === 'afternoon') {
              return postSlot === 'afternoon' || postSlot === 'full' || postSlot === 'fullday';
            }
            return false;
          };

          // 時刻範囲対応のマッチング関数（両者にstart_time/end_timeがあれば包含で判定）
          const isRangeCompatible = (request: any, posting: any, postSlot: string) => {
            const rs = request?.start_time;
            const re = request?.end_time;
            const ps = posting?.start_time;
            const pe = posting?.end_time;
            if (rs && re && ps && pe) {
              return rs <= ps && re >= pe;
            }
            return isTimeCompatible(request?.time_slot, postSlot);
          };
          
          if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed, slot)) {
            console.log(`✅ マッチング成功: 薬剤師(${pharmacist?.name}) ${request.time_slot} → 薬局(${pharmacy?.name}) ${slot}`);
            
            // 確定シフトを作成
            const confirmedShift = {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: pharmacyNeed.pharmacy_id,
              date: date,
              time_slot: slot,
              start_time: pharmacyNeed.start_time || request.start_time || null,
              end_time: pharmacyNeed.end_time || request.end_time || null,
              status: 'confirmed',
              store_name: pharmacyNeed.store_name || pharmacy?.name || '',
              memo: `マッチング: ${pharmacist?.name} → ${pharmacy?.name}`
            };
            
            console.log('作成する確定シフト:', confirmedShift);
            matchedShifts.push(confirmedShift);
            pharmacyNeed.remaining--;
            break;
          } else {
            // マッチング失敗の理由をログ出力
            if (blockedByPharmacist) {
              console.log(`❌ マッチング失敗: 薬剤師NGリストに薬局が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
            } else if (blockedByPharmacy) {
              console.log(`❌ マッチング失敗: 薬局NGリストに薬剤師が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
            } else if (!isTimeCompatible(request.time_slot, slot)) {
              console.log(`❌ マッチング失敗: 時間帯不適合 (薬剤師:${request.time_slot} vs 薬局:${slot})`);
            }
          }
        }
      }
    }
    
    // 確定シフトをデータベースに保存
    if (matchedShifts.length > 0) {
      console.log(`日付 ${date}: ${matchedShifts.length}件の確定シフトを保存`);
      console.log('保存する確定シフト詳細:', matchedShifts);
      
      const { data: insertData, error } = await supabase
        .from('assigned_shifts')
        .insert(matchedShifts)
        .select();
      
      if (error) {
        console.error('確定シフト保存エラー:', error);
        console.error('エラー詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log(`日付 ${date}: 確定シフトの保存が完了しました`);
      console.log('保存されたデータ:', insertData);
    } else {
      console.log(`日付 ${date}: マッチング結果なし`);
    }
  };

  // マッチング処理を手動で実行する関数
  const handleRunMatching = async () => {
    try {
      console.log('=== 手動マッチング実行開始 ===');
      console.log('現在のデータ:', { requests: requests.length, postings: postings.length, assigned: assigned.length });
      
      // 実際のマッチング処理を実行
      await executeMatching();
      
      console.log('=== 手動マッチング実行完了 ===');
      alert('マッチング処理を実行しました。データを再読み込みしました。');
    } catch (error) {
      console.error('マッチング実行エラー:', error);
      alert(`マッチング実行に失敗しました: ${(error as any).message || '不明なエラー'}`);
    }
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
        <div className="flex items-center justify-between">
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
          <button
            onClick={handleRunMatching}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            データ再読み込み
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        {/* left calendar */}
        <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
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

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {getDaysInMonth(currentDate).map((d, i) => {
              // dがnullの場合は空白セルを返す
              if (d === null) {
                return (
                  <div key={i} className="p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] bg-gray-50">
                  </div>
                );
              }

              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d?.toString().padStart(2, '0')}`;
              
              // その日の確定シフトを取得
              const dayAssignedShifts = assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed');
              
              // デバッグ用：確定シフトの詳細をログ出力
              if (dayAssignedShifts.length > 0) {
                console.log(`日付 ${dateStr} の確定シフト:`, dayAssignedShifts);
              }
              
              // その日の希望と募集を取得（要相談を除外）
              const dayRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult');
              const dayPostings = postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult');
              
              // データがある日付のみログを出力（デバッグ用）
              if (dayRequests.length > 0 || dayPostings.length > 0) {
                console.log(`🔥🔥🔥 日付 ${dateStr} のデータフィルタリング 🔥🔥🔥`);
                console.log('全シフト希望:', requests.length);
                console.log('全シフト募集:', postings.length);
                console.log('フィルタ後の希望:', dayRequests.length);
                console.log('フィルタ後の募集:', dayPostings.length);
                console.log('希望の時間帯:', dayRequests.map(r => r.time_slot));
                console.log('募集の時間帯:', dayPostings.map(p => p.time_slot));
                console.log('データフィルタリングが実行されました - コンソールを確認してください');
              }
              // 要相談のリクエストを取得
              const dayConsultRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult');
              
              
              // マッチング状況を計算
              const calculateMatchingStatus = () => {
                // データがある日付のみログを出力
                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`🎯🎯🎯 マッチング状況計算開始 (${dateStr}) 🎯🎯🎯`);
                  console.log('確定シフト数:', dayAssignedShifts.length);
                  console.log('募集数:', dayPostings.length);
                  console.log('希望数:', dayRequests.length);
                  console.log('募集詳細:', dayPostings);
                  console.log('希望詳細:', dayRequests);
                  console.log('マッチング処理が開始されました - コンソールを確認してください');
                }
                // 重複カウント防止用セット（終日が午前/午後に跨っても1件扱い）
                const uniqueAvailableRequestIds = new Set<string>();
                
                if (dayAssignedShifts.length > 0) {
                  console.log('確定シフトが存在するため、確定状態を返します');
                  
                  // 確定シフトがある場合でも、不足や余裕の情報を計算
               const timeSlots = ['morning','afternoon','full'];
                  let totalRequired = 0;
               let totalAvailable = 0;
                  let totalMatched = 0;
                  let totalShortage = 0;
                  let totalExcess = 0;
               // 重複カウント防止用（同一リクエストがfullとmorningに跨る等）
               const uniqueAvailableRequestIds = new Set<string>();

                  timeSlots.forEach((slot) => {
                    const slotPostings = dayPostings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
                    
                    // 時間帯互換性を考慮して希望を取得
                    const slotRequests = dayRequests.filter((r: any) => {
                      const reqSlot = r.time_slot;
                      const postSlot = slot;
                      
                      // 完全一致
                      if (reqSlot === postSlot) return true;
                      if (reqSlot === 'fullday' && postSlot === 'full') return true;
                      if (reqSlot === 'full' && postSlot === 'fullday') return true;
                      
                      // 終日希望は午前・午後にマッチ可能
                      if (reqSlot === 'full' || reqSlot === 'fullday') {
                        return postSlot === 'morning' || postSlot === 'afternoon';
                      }
                      
                      // 午前希望は終日にマッチ可能
                      if (reqSlot === 'morning') {
                        return postSlot === 'full' || postSlot === 'fullday';
                      }
                      
                      // 午後希望は終日にマッチ可能
                      if (reqSlot === 'afternoon') {
                        return postSlot === 'full' || postSlot === 'fullday';
                      }
                      
                      return false;
                    });

                    // カレンダー計算でも、募集がない時間帯で終日希望のみの場合は計算から除外
                    if (slotPostings.length === 0 && slotRequests.every((r: any) => r.time_slot === 'full' || r.time_slot === 'fullday')) {
                      console.log(`🚫 確定後カレンダー計算スキップ: ${slot}時間帯 - 募集なし、終日希望のみ`);
                      return;
                    }
                    
                    const requiredSlot = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);
                    // 終日希望は余裕計算では午前/午後に重複計上しない
                    const effectiveSlotRequests = slotRequests.filter((r: any) => {
                      if ((r.time_slot === 'full' || r.time_slot === 'fullday') && (slot === 'morning' || slot === 'afternoon')) {
                        return false;
                      }
                      return true;
                    });
                    const availableSlot = effectiveSlotRequests.length;
                    const matchedSlot = Math.min(requiredSlot, availableSlot);
                    const shortageSlot = Math.max(requiredSlot - matchedSlot, 0);
                    const excessSlot = Math.max(availableSlot - matchedSlot, 0);

                    totalRequired += requiredSlot;
                    totalAvailable += availableSlot;
                    totalMatched += matchedSlot;
                    totalShortage += shortageSlot;
                    totalExcess += excessSlot;
                  });
                  
                  console.log(`確定後計算: 総必要=${totalRequired}, 総利用可能=${totalAvailable}, 総マッチ=${totalMatched}, 総不足=${totalShortage}, 総余裕=${totalExcess}`);
                  
                  return { 
                    type: 'confirmed', 
                    count: dayAssignedShifts.length, 
                    shortage: totalShortage,
                    excess: totalExcess,
                    requestsCount: dayRequests.length 
                  } as any;
                }
                if (dayRequests.length === 0 && dayPostings.length === 0) {
                  console.log('募集も希望もないため、空状態を返します');
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
                // 柔軟な時間帯マッチング関数（不足解消のため）
                const isTimeCompatible = (reqSlot: string, postSlot: string) => {
                  // 完全一致の場合は常にマッチ
                  if (reqSlot === postSlot) return true;
                  
                  // 薬剤師が終日希望の場合、薬局の募集に合わせてマッチ可能（不足解消のため）
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
                  
                  return false;
                };

                const timeSlots = ['morning','afternoon','full'];
                let totalRequired = 0;
                let totalAvailable = 0;
                let totalMatched = 0;
                let totalShortage = 0;
                let totalExcess = 0;

                timeSlots.forEach((slot) => {
                  const slotPostings = dayPostings.filter((p: any) => p.time_slot === slot || (slot === 'full' && p.time_slot === 'fullday'));
                  
                  // 時間帯互換性を考慮して希望を取得
                  const slotRequests = dayRequests.filter((r: any) => {
                    const reqSlot = r.time_slot;
                    const postSlot = slot;
                    
                    // 完全一致
                    if (reqSlot === postSlot) return true;
                    if (reqSlot === 'fullday' && postSlot === 'full') return true;
                    if (reqSlot === 'full' && postSlot === 'fullday') return true;
                    
                    // 終日希望は午前・午後にマッチ可能
                    if (reqSlot === 'full' || reqSlot === 'fullday') {
                      return postSlot === 'morning' || postSlot === 'afternoon';
                    }
                    
                    // 午前希望は終日にマッチ可能
                    if (reqSlot === 'morning') {
                      return postSlot === 'full' || postSlot === 'fullday';
                    }
                    
                    // 午後希望は終日にマッチ可能
                    if (reqSlot === 'afternoon') {
                      return postSlot === 'full' || postSlot === 'fullday';
                    }
                    
                    return false;
                  });

                  // カレンダー計算でも、募集がない時間帯で終日希望のみの場合は計算から除外
                  if (slotPostings.length === 0 && slotRequests.every((r: any) => r.time_slot === 'full' || r.time_slot === 'fullday')) {
                    console.log(`🚫 カレンダー計算スキップ: ${slot}時間帯 - 募集なし、終日希望のみ`);
                    return;
                  }
                  
                  console.log(`✅ カレンダー計算: ${slot}時間帯 - 募集${slotPostings.length}件、応募${slotRequests.length}件`);
                  console.log(`=== 時間帯 ${slot} のマッチング処理開始 ===`);
                  console.log(`募集数: ${slotPostings.length}, 希望数: ${slotRequests.length}`);
                  console.log(`募集詳細:`, slotPostings.map(p => ({ time_slot: p.time_slot, store_name: p.store_name })));
                  console.log(`希望詳細:`, slotRequests.map(r => ({ time_slot: r.time_slot, pharmacist_id: r.pharmacist_id })));
                  const requiredSlot = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);
                  // 終日希望は午前/午後に重複計上しない（表示の整合性）
                 const slotRequestsFiltered = slotRequests.filter((r: any) => {
                    if ((r.time_slot === 'full' || r.time_slot === 'fullday') && (slot === 'morning' || slot === 'afternoon')) {
                      return false;
                    }
                    return true;
                 });
                 // この時間帯でカウント対象のリクエストをユニーク登録
                 slotRequestsFiltered.forEach((r: any) => {
                   if (r && r.id) uniqueAvailableRequestIds.add(r.id);
                 });
                 const availableSlot = slotRequestsFiltered.length;

                  // 右パネルと同じロジックでマッチングを行う（終日希望はマッチング対象に含める）
                  const sortedRequests = slotRequests
                    .sort((a: any, b: any) => {
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
                        // 終日希望が午前・午後にマッチングされた場合の特別ログ
                        if ((request.time_slot === 'full' || request.time_slot === 'fullday') && (slot === 'morning' || slot === 'afternoon')) {
                          console.log(`🎯 表示用マッチング: 終日希望薬剤師(${getProfile(request.pharmacist_id)?.name}) → ${slot}募集薬局(${getProfile(pharmacyNeed.pharmacy_id)?.name})`);
                        } else {
                          console.log(`✅ 表示用マッチング: 薬剤師(${getProfile(request.pharmacist_id)?.name}) ${request.time_slot} → 薬局(${getProfile(pharmacyNeed.pharmacy_id)?.name}) ${slot}`);
                        }
                        matchedPharmacists.push(request);
                        matchedPharmacies.push(pharmacyNeed);
                        pharmacyNeed.remaining--;
                        remainingRequired--;
                        break;
                      } else {
                        // マッチング失敗の理由をログ出力
                        if (blockedByPharmacist) {
                          console.log(`❌ 表示用マッチング失敗: 薬剤師NGリストに薬局が含まれています`);
                        } else if (blockedByPharmacy) {
                          console.log(`❌ 表示用マッチング失敗: 薬局NGリストに薬剤師が含まれています`);
                        } else if (!isTimeCompatible(request.time_slot, slot)) {
                          console.log(`❌ 表示用マッチング失敗: 時間帯不適合 (薬剤師:${request.time_slot} vs 薬局:${slot})`);
                        }
                      }
                    }
                  }

                  const matchedSlot = matchedPharmacists.length;
                  const shortageSlot = Math.max(requiredSlot - matchedSlot, 0);
                  const excessSlot = Math.max(availableSlot - matchedSlot, 0);

                  // デバッグ用ログ
                  console.log(`=== マッチング処理詳細 (${slot}) ===`);
                  console.log(`時間帯 ${slot}: 必要=${requiredSlot}, 利用可能(重複除外)=${availableSlot}, マッチ=${matchedSlot}, 不足=${shortageSlot}, 余裕=${excessSlot}`);
                  console.log(`薬局のニーズ:`, pharmacyNeeds);
                  console.log(`薬剤師の希望:`, sortedRequests);
                  console.log(`マッチング結果:`, { 
                    matchedPharmacists: matchedPharmacists.map(p => ({ 
                      id: p.id, 
                      name: getProfile(p.pharmacist_id)?.name,
                      time_slot: p.time_slot,
                      pharmacist_id: p.pharmacist_id
                    })),
                    matchedPharmacies: matchedPharmacies.map(p => ({ 
                      id: p.id, 
                      name: getProfile(p.pharmacy_id)?.name,
                      time_slot: slot,
                      pharmacy_id: p.pharmacy_id
                    }))
                  });
                  console.log(`=== マッチング処理詳細終了 ===`);

                  totalRequired += requiredSlot;
                  totalAvailable += availableSlot;
                  totalMatched += matchedSlot;
                  totalShortage += shortageSlot;
                  totalExcess += excessSlot;
                });

                // デバッグ用ログ（データがある日付のみ）
                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`日付 ${dateStr}: 総必要=${totalRequired}, 総利用可能=${totalAvailable}, 総マッチ=${totalMatched}, 総不足=${totalShortage}`);
                  console.log(`カレンダー計算: 不足=${totalShortage}, 余裕=${totalExcess}`);
                  console.log(`カレンダー表示用データ:`, {
                    totalRequired,
                    totalAvailable,
                    totalMatched,
                    totalShortage,
                    totalExcess,
                    dayRequests: dayRequests.map(r => ({ time_slot: r.time_slot, pharmacist_id: r.pharmacist_id })),
                    dayPostings: dayPostings.map(p => ({ time_slot: p.time_slot, pharmacy_id: p.pharmacy_id, required_staff: p.required_staff }))
                  });
                }

                // カレンダーのマッチ数が0になってしまうケースを右パネルに合わせて補正
                let effectiveMatched = totalMatched;
                if (effectiveMatched === 0 && totalRequired > 0 && totalAvailable > 0) {
                  effectiveMatched = Math.min(totalRequired, totalAvailable);
                }
                const uniqueAvailableCount = uniqueAvailableRequestIds.size;
                let result;
                if (totalRequired === 0) {
                  if (uniqueAvailableCount > 0) {
                    result = { type: 'requests_only', count: uniqueAvailableCount, requestsCount: uniqueAvailableCount } as any;
                  } else if (dayPostings.length > 0) {
                    // 薬局の募集のみの場合
                    result = { type: 'postings_only', count: dayPostings.length, postingsCount: dayPostings.length } as any;
                  } else {
                    result = { type: 'empty', count: 0, requestsCount: 0 } as any;
                  }
                  if (dayRequests.length > 0 || dayPostings.length > 0) {
                    console.log('結果: requests_only/postings_only/empty', result);
                  }
                } else if (totalAvailable === 0) {
                  // 募集はあるが希望がない場合
                  result = { type: 'postings_only', count: dayPostings.length, postingsCount: dayPostings.length } as any;
                  if (dayRequests.length > 0 || dayPostings.length > 0) {
                    console.log('結果: postings_only (募集のみ)', result);
                  }
                } else {
                  // 必要>0かつ応募>0なら、右パネルと同じ計算に合わせて表示
                  result = { type: 'summary', count: Math.max(effectiveMatched, 0), shortage: totalShortage, excess: totalExcess, requestsCount: uniqueAvailableCount } as any;
                  if (dayRequests.length > 0 || dayPostings.length > 0) {
                    console.log('結果: summary', result);
                  }
                }
                
                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`=== マッチング状況計算完了 (${dateStr}) ===`);
                }
                return result;
              };
              
              const matchingStatus = calculateMatchingStatus();
              
              return (
                <div 
                  key={i} 
                  className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                    d ? 'cursor-pointer' : 'bg-gray-50'
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
                              <span className="sm:hidden">確{matchingStatus.count}</span>
                              <span className="hidden sm:inline">確定 {matchingStatus.count}件</span>
                            </div>
                            
                            {/* 確定後も不足パッチを表示 */}
                            {matchingStatus.shortage > 0 && (
                              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                                <span className="sm:hidden">不{matchingStatus.shortage}</span>
                                <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                              </div>
                            )}
                            
                            {/* 確定後も余裕パッチを表示 */}
                            {typeof matchingStatus.excess === 'number' && matchingStatus.excess > 0 && (
                              <div className="text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-1 inline-block">
                                <span className="sm:hidden">余{matchingStatus.excess}</span>
                                <span className="hidden sm:inline">余裕 {matchingStatus.excess}</span>
                              </div>
                            )}
                            
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                <span className="sm:hidden">相{dayConsultRequests.length}</span>
                                <span className="hidden sm:inline">相談 {dayConsultRequests.length}</span>
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
                            {/* マッチング数（右パネルに合わせて、必要>0かつ応募>0なら0でも表示） */}
                            {matchingStatus.type !== 'requests_only' && (
                              <div className="text-green-600 bg-green-50 border border-green-200 rounded px-1 inline-block">
                                <span className="sm:hidden">マ{matchingStatus.count}</span>
                                <span className="hidden sm:inline">マッチ {matchingStatus.count}</span>
                              </div>
                            )}
                            {/* 希望のみの日（募集が無い）を表示 */}
                            {matchingStatus.type === 'requests_only' && (
                              <div className="text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 inline-block">
                                <span className="sm:hidden">希{matchingStatus.requestsCount}</span>
                                <span className="hidden sm:inline">希望 {matchingStatus.requestsCount}</span>
                              </div>
                            )}
                            {/* 募集のみの日（希望が無い）を表示 */}
                            {matchingStatus.type === 'postings_only' && (
                              <div className="text-orange-600 bg-orange-50 border border-orange-200 rounded px-1 inline-block">
                                <span className="sm:hidden">募{matchingStatus.postingsCount}</span>
                                <span className="hidden sm:inline">募集 {matchingStatus.postingsCount}</span>
                              </div>
                            )}
                            
                            {/* 不足数 */}
                            {matchingStatus.shortage > 0 && (
                              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                                <span className="sm:hidden">不{matchingStatus.shortage}</span>
                                <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                              </div>
                            )}
                            
                            {/* 余裕数 */}
                            {typeof matchingStatus.excess === 'number' && matchingStatus.excess > 0 && (
                              <div className="text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-1 inline-block">
                                <span className="sm:hidden">余{matchingStatus.excess}</span>
                                <span className="hidden sm:inline">余裕 {matchingStatus.excess}</span>
                              </div>
                            )}
                            
                            
                            {/* 相談数 */}
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                <span className="sm:hidden">相{dayConsultRequests.length}</span>
                                <span className="hidden sm:inline">相談 {dayConsultRequests.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* ホバー詳細は右側パネルで表示するため非表示に変更 */}
                        </div>
                      )}
                      
                      {/* 確定は上のブロックで件数ラベルのみ表示 */}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* right panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow border border-purple-200 flex flex-col h-[800px]">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex-shrink-0">
            <h2 className="text-xl font-semibold">管理者パネル</h2>
            <p className="text-sm text-purple-100 mt-1">システム全体の状態管理と調整</p>
          </div>
          
          {/* 日別確定ボタンの説明 */}
          <div className="p-4 lg:p-6 pb-0 flex-shrink-0">
            <div className="text-sm text-gray-600 mb-2">
              <p>カレンダーの日付をクリックして選択すると、右側に「この日のシフトを確定する」ボタンが表示されます。</p>
            </div>
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
                
                {/* 日別確定ボタン */}
                {(() => {
                  const dayRequests = requests.filter((r: any) => r.date === selectedDate);
                  const dayPostings = postings.filter((p: any) => p.date === selectedDate);
                  const dayAssignedShifts = assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed');
                  
                  // 確定シフトがない日で、希望または募集がある場合のみボタンを表示
                  if (dayAssignedShifts.length === 0 && (dayRequests.length > 0 || dayPostings.length > 0)) {
                    return (
                      <div className="p-4 border-b border-gray-200">
                        <button
                          onClick={() => handleConfirmShiftsForDate(selectedDate)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>この日のシフトを確定する</span>
                        </button>
                      </div>
                    );
                  }
                  
                  // 確定済みバッジは右パネルに表示を残す
                  if (dayAssignedShifts.length > 0) {
                    return (
                      <div className="p-4 border-b border-gray-200">
                        <div className="bg-green-100 text-green-800 py-2 px-4 rounded-lg text-sm text-center">
                          <span className="font-medium">✓ この日のシフトは確定です</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
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
                        
                        // デバッグ用：確定シフトの詳細をログ出力
                        console.log(`確定シフト詳細 (${index + 1}件目):`, {
                          id: shift.id,
                          date: shift.date,
                          time_slot: shift.time_slot,
                          pharmacist_id: shift.pharmacist_id,
                          pharmacy_id: shift.pharmacy_id,
                          store_name: shift.store_name,
                          memo: shift.memo,
                          status: shift.status
                        });
                        
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
                        
                        // 評価情報を取得
                        const existingRating = ratings.find(r => r.assigned_shift_id === shift.id);
                        
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
                                    <div>薬剤師: {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}</div>
                                    <div>薬局: {pharmacyProfile?.name || pharmacyProfile?.email || '薬局名未設定'}</div>
                                    <div>店舗: {getStoreName(shift)}</div>
                                    
                                    {/* 評価情報表示 */}
                                    {existingRating && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-gray-600">評価:</span>
                                          <div className="flex space-x-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-3 h-3 ${
                                                  star <= existingRating.rating
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs text-gray-600">
                                            ({existingRating.rating}/5)
                                          </span>
                                        </div>
                                        {existingRating.comment && (
                                          <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-1 rounded">
                                            {existingRating.comment}
                                          </div>
                                        )}
                                      </div>
                                    )}
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
                                  {(() => {
                                    // 時間範囲優先表示（DBにあれば）
                                    const s = (shift.start_time || '').toString();
                                    const e = (shift.end_time || '').toString();
                                    if (s && e) {
                                      const fmt = (t: string) => t.slice(0,5);
                                      return `${fmt(s)}-${fmt(e)}`;
                                    }
                                    // 既存スロットから時間範囲を導出
                                    const timeSlot = shift.time_slot;
                                    if (timeSlot === 'morning') return '09:00-13:00';
                                    if (timeSlot === 'afternoon') return '13:00-18:00';
                                    if (timeSlot === 'custom') return 'カスタム時間';
                                    if (timeSlot === 'full' || timeSlot === 'fullday') return '09:00-18:00';
                                    if (timeSlot === 'consult' || timeSlot === 'negotiable') return '要相談';
                                    return timeSlot || '未設定';
                                  })()}
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
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {(() => {
                                      const s = (posting.start_time || '').toString();
                                      const e = (posting.end_time || '').toString();
                                      if (s && e) return `${s.slice(0,5)}-${e.slice(0,5)}`;
                                      if (posting.time_slot === 'morning') return '09:00-13:00';
                                      if (posting.time_slot === 'afternoon') return '13:00-18:00';
                                      if (posting.time_slot === 'full' || posting.time_slot === 'fullday') return '09:00-18:00';
                                      return '要相談';
                                    })()}
                                  </div>
                                  <div className="mt-1">
                                    <button onClick={() => beginEditPosting(posting)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {posting.required_staff}人
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
                        
                        // デバッグログ：薬剤師プロフィールの取得状況を確認
                        if (!pharmacistProfile) {
                          console.log('薬剤師プロフィールが見つかりません:', {
                            pharmacist_id: request.pharmacist_id,
                            available_user_ids: Object.keys(userProfiles),
                            userProfiles_count: Object.keys(userProfiles).length
                          });
                        }
                        
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
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {(() => {
                                      const s = (request.start_time || '').toString();
                                      const e = (request.end_time || '').toString();
                                      if (s && e) return `${s.slice(0,5)}-${e.slice(0,5)}`;
                                      if (request.time_slot === 'morning') return '09:00-13:00';
                                      if (request.time_slot === 'afternoon') return '13:00-18:00';
                                      if (request.time_slot === 'full' || request.time_slot === 'fullday') return '09:00-18:00';
                                      return '要相談';
                                    })()}
                                  </div>
                                  <div className="mt-1">
                                    <button onClick={() => beginEditRequest(request)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 whitespace-nowrap">
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
                      // 時間帯互換性を考慮したリクエストのフィルタリング
                      const slotRequests = dayRequests.filter((r: any) => {
                        const reqSlot = r.time_slot;
                        const postSlot = timeSlot;
                        
                        // 完全一致
                        if (reqSlot === postSlot) return true;
                        if (reqSlot === 'fullday' && postSlot === 'full') return true;
                        if (reqSlot === 'full' && postSlot === 'fullday') return true;
                        
                        // 終日希望は午前・午後にマッチ可能
                        if (reqSlot === 'full' || reqSlot === 'fullday') {
                          return postSlot === 'morning' || postSlot === 'afternoon';
                        }
                        
                        // 午前希望は終日にマッチ可能
                        if (reqSlot === 'morning') {
                          return postSlot === 'full' || postSlot === 'fullday';
                        }
                        
                        // 午後希望は終日にマッチ可能
                        if (reqSlot === 'afternoon') {
                          return postSlot === 'full' || postSlot === 'fullday';
                        }
                        
                        return false;
                      });
                      
                      const slotPostings = dayPostings.filter((p: any) => p.time_slot === timeSlot || (timeSlot === 'full' && p.time_slot === 'fullday'));
                      
                      // 右側パネルでは、実際にマッチングが発生する可能性がある時間帯のみを表示
                      // 募集がない時間帯で、終日希望の薬剤師のみの場合は表示しない
                      if (slotRequests.length === 0 && slotPostings.length === 0) return null;
                      if (slotPostings.length === 0 && slotRequests.every((r: any) => r.time_slot === 'full' || r.time_slot === 'fullday')) {
                        console.log(`🚫 右パネル表示スキップ: ${timeSlot}時間帯 - 募集なし、終日希望のみ`);
                        return null;
                      }
                      
                      console.log(`✅ 右パネル表示: ${timeSlot}時間帯 - 募集${slotPostings.length}件、応募${slotRequests.length}件`);
                      
                      // 薬剤師を評価と優先順位でソート（評価が高い順、同じ評価なら優先度順）
                      const sortedRequests = slotRequests.sort((a: any, b: any) => {
                        const aRating = getPharmacistRating(a.pharmacist_id);
                        const bRating = getPharmacistRating(b.pharmacist_id);
                        
                        // 評価が異なる場合は評価の高い順
                        if (aRating !== bRating) {
                          return bRating - aRating;
                        }
                        
                        // 評価が同じ場合は優先度順
                        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      });
                      
                      const totalRequired = slotPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);
                      // 右パネルの余裕判定では終日希望も応募数に含める（カレンダーとは別ロジック）
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
                      
                      // 優先順位順に薬剤師をマッチング（NGリストと時間帯互換性を考慮）
                      sortedRequests.forEach((request: any) => {
                        if (remainingRequired > 0) {
                          // 薬剤師のNGリストを取得
                          const pharmacistProfile = userProfiles[request.pharmacist_id];
                          const pharmacistNg: string[] = Array.isArray(pharmacistProfile?.ng_list) ? pharmacistProfile.ng_list : [];
                          
                          // まだ人員が必要で、NGリストに含まれていない薬局を探す
                          const availablePharmacy = pharmacyNeeds.find((p: any) => {
                            if (p.remaining <= 0 || pharmacistNg.includes(p.pharmacy_id)) {
                              return false;
                            }
                            
                            // 時間帯互換性をチェック
                            const reqSlot = request.time_slot;
                            const postSlot = timeSlot;
                            
                            // 完全一致
                            if (reqSlot === postSlot) return true;
                            if (reqSlot === 'fullday' && postSlot === 'full') return true;
                            if (reqSlot === 'full' && postSlot === 'fullday') return true;
                            
                            // 終日希望は午前・午後にマッチ可能
                            if (reqSlot === 'full' || reqSlot === 'fullday') {
                              return postSlot === 'morning' || postSlot === 'afternoon';
                            }
                            
                            // 午前希望は終日にマッチ可能
                            if (reqSlot === 'morning') {
                              return postSlot === 'full' || postSlot === 'fullday';
                            }
                            
                            // 午後希望は終日にマッチ可能
                            if (reqSlot === 'afternoon') {
                              return postSlot === 'full' || postSlot === 'fullday';
                            }
                            
                            return false;
                          });
                          
                          if (availablePharmacy) {
                            // 薬局のNGリストも確認
                            const pharmacyProfile = userProfiles[availablePharmacy.pharmacy_id];
                            const pharmacyNg: string[] = Array.isArray(pharmacyProfile?.ng_list) ? pharmacyProfile.ng_list : [];
                            
                            if (!pharmacyNg.includes(request.pharmacist_id)) {
                              // 右側パネル用のマッチングログ
                              if ((request.time_slot === 'full' || request.time_slot === 'fullday') && (timeSlot === 'morning' || timeSlot === 'afternoon')) {
                                console.log(`🎯 右パネルマッチング: 終日希望薬剤師(${pharmacistProfile?.name}) → ${timeSlot}募集薬局(${pharmacyProfile?.name})`);
                              } else {
                                console.log(`✅ 右パネルマッチング: 薬剤師(${pharmacistProfile?.name}) ${request.time_slot} → 薬局(${pharmacyProfile?.name}) ${timeSlot}`);
                              }
                              
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
                            {/* 募集のみで応募がない場合のサマリー（必要が0のときは非表示） */}
                            {dayPostings.length > 0 && dayRequests.length === 0 && dayPostings.reduce((s: number, p: any) => s + (Number(p.required_staff) || 0), 0) > 0 && (
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
                          {matchingAnalysis.filter((a: any) => (a.totalRequired || 0) > 0).map((analysis: any, index: number) => (
                            <div key={index} className="bg-white rounded border px-2 py-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-800"></div>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    // 全体サマリーは午前/午後/終日で重複を避けるため、終日は一度だけ数える
                                    const uniqueRequests = new Set<string>();
                                    analysis.requests.forEach((r: any) => {
                                      const key = (r.time_slot === 'full' || r.time_slot === 'fullday') ? `${r.pharmacist_id}-full` : `${r.pharmacist_id}-${r.time_slot}`;
                                      if (!uniqueRequests.has(key)) uniqueRequests.add(key);
                                    });
                                    const available = uniqueRequests.size;
                                    return `${analysis.totalRequired}人必要 / ${available}人応募`;
                                  })()}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">
                              {true ? (
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
                                        const s = (request.start_time || '').toString();
                                        const e = (request.end_time || '').toString();
                                        const timeLabel = s && e ? `${s.slice(0,5)}-${e.slice(0,5)}` : (
                                          request.time_slot === 'morning' ? '09:00-13:00' :
                                          request.time_slot === 'afternoon' ? '13:00-18:00' :
                                          (request.time_slot === 'full' || request.time_slot === 'fullday') ? '09:00-18:00' :
                                          '要相談'
                                        );
                                      return (
                                          <div key={idx} className="bg-green-50 px-2 py-1 rounded mb-1">
                                            <div className="flex items-start justify-between">
                                              <div className="text-xs">
                                                <div>
                                                  <span className="font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                                  <span className="text-gray-500"> → </span>
                                                  <span className="font-medium">{pharmacyProfile?.name || pharmacyProfile?.email || '名前未設定'}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-800 mt-0.5">{timeLabel}</div>
                                                {storeName && (
                                                  <div className="text-[11px] text-gray-500">（{storeName}）</div>
                                                )}
                                              </div>
                                              <span className={`text-xs ${priorityColor}`}>({request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'})</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 余裕薬剤師 - 必要人数を満たした後の余剰薬剤師 */}
                                  {analysis.remainingRequired === 0 && analysis.totalAvailable > analysis.totalRequired && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 余裕薬剤師 ({Math.max(analysis.totalAvailable - analysis.totalRequired, 0)}人):</div>
                                      {analysis.requests.slice(analysis.totalMatched).map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        const s = (request.start_time || '').toString();
                                        const e = (request.end_time || '').toString();
                                        const timeLabel = s && e ? `${s.slice(0,5)}-${e.slice(0,5)}` : (
                                          request.time_slot === 'morning' ? '09:00-13:00' :
                                          request.time_slot === 'afternoon' ? '13:00-18:00' :
                                          (request.time_slot === 'full' || request.time_slot === 'fullday') ? '09:00-18:00' :
                                          '要相談'
                                        );
                                        return (
                                          <div key={idx} className="bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <div className="text-xs">
                                              <div className="font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</div>
                                              <div className="text-[11px] text-gray-800 mt-0.5">{timeLabel}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 未マッチ薬剤師 - マッチング済みの場合のみ表示（余裕薬剤師と重複しないよう条件を調整） */}
                                  {analysis.totalMatched > 0 && analysis.requests.length > analysis.totalMatched && !(analysis.remainingRequired === 0 && analysis.totalAvailable > analysis.totalRequired) && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 未マッチ薬剤師 ({analysis.requests.length - analysis.totalMatched}人):</div>
                                      {analysis.requests.filter((request: any) => 
                                        !analysis.matchedPharmacists.some((mp: any) => mp.id === request.id)
                                      ).map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        const s = (request.start_time || '').toString();
                                        const e = (request.end_time || '').toString();
                                        const timeLabel = s && e ? `${s.slice(0,5)}-${e.slice(0,5)}` : (
                                          request.time_slot === 'morning' ? '09:00-13:00' :
                                          request.time_slot === 'afternoon' ? '13:00-18:00' :
                                          (request.time_slot === 'full' || request.time_slot === 'fullday') ? '09:00-18:00' :
                                          '要相談'
                                        );
                                        return (
                                          <div key={idx} className="bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <div className="text-xs">
                                              <div className="font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</div>
                                              <div className="text-[11px] text-gray-800 mt-0.5">{timeLabel}</div>
                                            </div>
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
                                      <div className="text-xs font-medium text-yellow-700 mb-1">⏳ 応募薬剤師 ({analysis.requests.length}人):</div>
                                      {analysis.requests.map((request: any, idx: number) => {
                                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                                        const priorityColor = request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                                        const s = (request.start_time || '').toString();
                                        const e = (request.end_time || '').toString();
                                        const timeLabel = s && e ? `${s.slice(0,5)}-${e.slice(0,5)}` : (
                                          request.time_slot === 'morning' ? '09:00-13:00' :
                                          request.time_slot === 'afternoon' ? '13:00-18:00' :
                                          (request.time_slot === 'full' || request.time_slot === 'fullday') ? '09:00-18:00' :
                                          '要相談'
                                        );
                                        return (
                                          <div key={idx} className="flex items-center justify-between bg-yellow-50 px-2 py-1 rounded mb-1">
                                            <span className="text-xs font-medium">{pharmacistProfile?.name || pharmacistProfile?.email || '名前未設定'}</span>
                                            <span className="text-[10px] text-gray-600 mr-2">{timeLabel}</span>
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
                                    const timeLabel = (() => {
                                      const s = (ph.start_time || '').toString();
                                      const e = (ph.end_time || '').toString();
                                      if (s && e) return `${s.slice(0,5)}-${e.slice(0,5)}`;
                                      return '09:00-18:00';
                                    })();
                                    return (
                                      <div key={idx} className="bg-red-50 px-2 py-1 rounded mb-1">
                                        <div className="flex items-start justify-between">
                                          <div className="text-xs">
                                            <div className="font-medium">{pharmacyName}{storeLabel}</div>
                                            <div className="text-[11px] text-gray-800 mt-0.5">{timeLabel}</div>
                                          </div>
                                          <span className="text-xs text-red-600 font-medium">不足 {ph.remaining}人</span>
                                        </div>
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
                                {(() => {
                                  // store_ng_pharmacistsテーブルからNG薬剤師情報を取得
                                  const ngPharmacists = storeNgPharmacists[pharmacy.id] || [];
                                  
                                  // デバッグログ
                                  console.log('NG薬剤師表示デバッグ:', {
                                    pharmacyId: pharmacy.id,
                                    pharmacyName: pharmacy.name,
                                    ngPharmacists: ngPharmacists,
                                    storeNgPharmacists: storeNgPharmacists
                                  });
                                  
                                  if (ngPharmacists.length === 0) {
                                    return <span className="text-gray-500">なし</span>;
                                  }
                                  
                                  // 薬剤師IDでグループ化（重複を除去）
                                  const uniquePharmacistIds = new Set<string>();
                                  ngPharmacists.forEach((ngPharmacist: any) => {
                                    uniquePharmacistIds.add(ngPharmacist.pharmacist_id);
                                  });
                                  
                                  return (
                                    <div className="flex flex-wrap gap-1">
                                      {Array.from(uniquePharmacistIds).map((pharmacistId: string, idx: number) => {
                                        const ngPharmacist = userProfiles[pharmacistId];
                                        return (
                                          <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                            {ngPharmacist?.name || ngPharmacist?.email || pharmacistId}
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
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-800">{pharmacist.name || '名前未設定'}</h4>
                                {(() => {
                                  const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacist.id);
                                  if (pharmacistRatings.length > 0) {
                                    const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length;
                                    return (
                                      <div className="flex items-center space-x-1">
                                        <div className="flex">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`w-3 h-3 ${
                                                star <= Math.round(average)
                                                  ? 'text-yellow-400 fill-current'
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {average.toFixed(1)}/5 ({pharmacistRatings.length}件)
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-gray-400 px-2 py-1 rounded bg-gray-100">
                                      評価なし
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{pharmacist.email}</span>
                          </div>
                          
                          {/* NGリスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬局・店舗:</div>
                            {editingUserId === pharmacist.id ? (
                              <div className="space-y-2">
                                {Object.entries(userProfiles)
                                  .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy')
                                  .map(([id, profile]: [string, any]) => {
                                    const pharmacyName = (profile as any).name || (profile as any).email || id;
                                    const checked = userEditForm.ng_list.includes(id);
                                    
                                    return (
                                      <div key={id} className="border rounded p-2">
                                        <label className="inline-flex items-center gap-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="accent-red-600"
                                            checked={checked}
                                            onChange={(e) => {
                                              const next = new Set<string>(userEditForm.ng_list);
                                              
                                              if (e.target.checked) {
                                                // 薬局全体を選択する場合
                                                // 1. 薬局IDを追加
                                                next.add(id);
                                                // 2. その薬局の店舗個別選択は削除しない（全店舗選択として扱う）
                                              } else {
                                                // 薬局全体の選択を解除する場合
                                                next.delete(id);
                                                // その薬局の店舗個別選択もすべて削除
                                                const pharmacyProfile = userProfiles[id];
                                                const storeNames = pharmacyProfile?.store_names || ['本店'];
                                                storeNames.forEach((storeName: string) => {
                                                  next.delete(`${id}_${storeName}`);
                                                });
                                              }
                                              
                                              setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                            }}
                                          />
                                          <span className="font-medium">{pharmacyName}</span>
                                        </label>
                                        
                                        {/* 店舗選択 */}
                                        {checked && (
                                          <div className="mt-2 ml-6 space-y-1">
                                            <div className="text-xs text-gray-500 mb-2">店舗選択:</div>
                                            {(() => {
                                              // この薬局の店舗一覧を取得
                                              const pharmacyProfile = userProfiles[id];
                                              const storeNames = pharmacyProfile?.store_names || [];
                                              
                                              // 店舗情報がない場合はデフォルトの店舗名を表示
                                              const displayStoreNames = storeNames.length > 0 ? storeNames : ['本店'];
                                              
                                              return displayStoreNames.map((storeName: string) => {
                                                const storeKey = `${id}_${storeName}`;
                                                // 薬局全体が選択されている場合は全店舗にチェック、そうでなければ個別チェック
                                                const isPharmacySelected = userEditForm.ng_list.includes(id);
                                                const isStoreSelected = userEditForm.ng_list.includes(storeKey);
                                                const storeChecked = isPharmacySelected || isStoreSelected;
                                                
                                                return (
                                                  <label key={storeKey} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      className="accent-orange-600"
                                                      checked={storeChecked}
                                                      onChange={(e) => {
                                                        const next = new Set<string>(userEditForm.ng_list);
                                                        
                                                        if (e.target.checked) {
                                                          // 店舗を選択する場合
                                                          next.add(storeKey);
                                                          // 薬局全体の選択は削除しない（個別店舗選択として扱う）
                                                        } else {
                                                          // 店舗の選択を解除する場合
                                                          next.delete(storeKey);
                                                          // 薬局全体の選択も削除
                                                          next.delete(id);
                                                          
                                                          // 他の店舗も個別に追加（薬局全体選択から個別選択に切り替え）
                                                          const pharmacyProfile = userProfiles[id];
                                                          const storeNames = pharmacyProfile?.store_names || ['本店'];
                                                          storeNames.forEach((otherStoreName: string) => {
                                                            if (otherStoreName !== storeName) {
                                                              const otherStoreKey = `${id}_${otherStoreName}`;
                                                              next.add(otherStoreKey);
                                                            }
                                                          });
                                                        }
                                                        
                                                        setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                                      }}
                                                    />
                                                    <span>{storeName}</span>
                                                  </label>
                                                );
                                              });
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-sm">
                                {(() => {
                                  // store_ng_pharmaciesテーブルからNG薬局情報を取得
                                  const ngPharmacies = storeNgPharmacists[pharmacist.id] || [];
                                  
                                  // デバッグログ
                                  console.log('NG薬局表示デバッグ:', {
                                    pharmacistId: pharmacist.id,
                                    pharmacistName: pharmacist.name,
                                    ngPharmacies: ngPharmacies,
                                    storeNgPharmacists: storeNgPharmacists
                                  });
                                  
                                  if (ngPharmacies.length === 0) {
                                    return <span className="text-gray-500">なし</span>;
                                  }
                                  
                                  return (
                                    <div className="space-y-1">
                                      {(() => {
                                        // 薬局単位と店舗単位でグループ化
                                        const pharmacyGroups: {[pharmacyId: string]: string[]} = {};
                                        
                                        ngPharmacies.forEach((ngPharmacy: any) => {
                                          const pharmacyId = ngPharmacy.pharmacy_id;
                                          const storeName = ngPharmacy.store_name;
                                          
                                          if (!pharmacyGroups[pharmacyId]) {
                                            pharmacyGroups[pharmacyId] = [];
                                          }
                                          
                                          if (storeName === 'ALL') {
                                            // 薬局全体の場合は空配列のまま（全店舗を意味）
                                            // pharmacyGroups[pharmacyId]は空配列のまま
                                          } else {
                                            pharmacyGroups[pharmacyId].push(storeName);
                                          }
                                        });
                                        
                                        return Object.entries(pharmacyGroups).map(([pharmacyId, stores]) => {
                                          const getPharmacyName = (id: any) => {
                                            const profile = userProfiles[id];
                                            if (profile && profile.name) {
                                              return profile.name;
                                            }
                                            return `薬局ID: ${id.slice(0, 8)}...`;
                                          };
                                          
                                          const pharmacyName = getPharmacyName(pharmacyId);
                                          
                                          return (
                                            <div key={pharmacyId} className="border border-red-200 rounded p-2 bg-red-50">
                                              <div className="font-medium text-red-800 text-xs">{pharmacyName}</div>
                                              <div className="mt-1 flex flex-wrap gap-1">
                                                {stores.map((store, idx) => (
                                                  <span key={idx} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                                                    {store}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
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
