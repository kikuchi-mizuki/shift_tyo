/**
 * useAdminData.ts
 * 管理画面のデータ取得・キャッシュ管理を行うカスタムフック
 *
 * AdminDashboard.tsxから抽出されたデータフェッチロジック
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { shiftPostings } from '../../lib/supabase';
import { safeLength, safeObject } from '../../utils/admin/arrayHelpers';

interface RecruitmentStatus {
  is_open: boolean;
  updated_at: string;
  updated_by: string | null;
  notes: string | null;
}

interface UseAdminDataReturn {
  // データ
  requests: any[];
  postings: any[];
  assigned: any[];
  userProfiles: any;
  ratings: any[];
  storeNgPharmacists: { [pharmacyId: string]: any[] };
  storeNgPharmacies: { [pharmacistId: string]: any[] };
  recruitmentStatus: RecruitmentStatus;

  // 状態
  loading: boolean;
  error: string | null;

  // 操作
  reload: () => Promise<void>;
  loadRecruitmentStatus: () => Promise<void>;
  loadAssignedShifts: () => Promise<void>;
  toggleRecruitmentStatus: () => Promise<void>;
}

const FIXED_RECRUITMENT_ID = '00000000-0000-0000-0000-000000000001';

export const useAdminData = (
  supabase: SupabaseClient,
  user: any,
  currentDate: Date
): UseAdminDataReturn => {
  const [requests, setRequests] = useState<any[]>([]);
  const [postings, setPostings] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [ratings, setRatings] = useState<any[]>([]);
  const [storeNgPharmacists, setStoreNgPharmacists] = useState<{ [pharmacyId: string]: any[] }>({});
  const [storeNgPharmacies, setStoreNgPharmacies] = useState<{ [pharmacistId: string]: any[] }>({});
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>({
    is_open: true,
    updated_at: '',
    updated_by: null,
    notes: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 募集ステータスを読み込む
   */
  const loadRecruitmentStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recruitment_status')
        .select('*')
        .eq('id', FIXED_RECRUITMENT_ID)
        .single();

      if (error) {
        console.error('募集状況読み込みエラー:', error);
        return;
      }

      if (data) {
        setRecruitmentStatus({
          is_open: data.is_open,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
          notes: data.notes
        });
      }
    } catch (error) {
      console.error('募集状況読み込みエラー:', error);
    }
  }, [supabase]);

  /**
   * 確定シフトを読み込む
   */
  const loadAssignedShifts = useCallback(async () => {
    try {
      if (!supabase) {
        console.error('Supabase client is not available');
        return;
      }

      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select(`
          *,
          pharmacist:pharmacist_id(name),
          pharmacy:pharmacy_id(name)
        `)
        .order('created_at', { ascending: false });

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
  }, [supabase]);

  /**
   * 全データを読み込む
   */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== loadAll started - データ読み込み開始 ===');

      // 募集状況を読み込み
      await loadRecruitmentStatus();

      // 確定シフトを読み込み
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*');

      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setAssigned([]);
      } else {
        setAssigned(assignedData || []);
      }

      // シフト希望を読み込み
      const { data: requestsData, error: requestsError } = await supabase
        .from('shift_requests')
        .select('*');

      if (requestsError) {
        console.error('Error loading shift requests:', requestsError);
      }

      setRequests(requestsData || []);

      // シフト募集を読み込み
      const { data: postingsData } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(postingsData || []);

      // ユーザーIDを収集
      const userIds = new Set<string>();

      if (assignedData) {
        assignedData.forEach((shift: any) => {
          userIds.add(shift.pharmacist_id);
          userIds.add(shift.pharmacy_id);
        });
      }

      if (requestsData) {
        requestsData.forEach((request: any) => {
          if (request.pharmacist_id) {
            userIds.add(request.pharmacist_id);
          }
        });
      }

      if (postingsData) {
        postingsData.forEach((posting: any) => {
          if (posting.pharmacy_id) {
            userIds.add(posting.pharmacy_id);
          }
        });
      }

      // ユーザープロフィールを取得
      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (allProfilesError) {
        console.error('Error fetching user profiles:', allProfilesError);
      } else {
        const profilesMap: any = {};
        if (allProfilesData) {
          allProfilesData.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
        }
        setUserProfiles(profilesMap);
      }

      // 薬剤師評価を取得
      const { data: ratingsData } = await supabase
        .from('pharmacist_ratings')
        .select('*');

      setRatings(ratingsData || []);

      // NG薬局/薬剤師リストを取得
      const { data: ngPharmaciesData } = await supabase
        .from('store_ng_pharmacies')
        .select('*');

      if (ngPharmaciesData) {
        const ngMap: { [pharmacistId: string]: any[] } = {};
        ngPharmaciesData.forEach((ng: any) => {
          if (!ngMap[ng.pharmacist_id]) {
            ngMap[ng.pharmacist_id] = [];
          }
          ngMap[ng.pharmacist_id].push(ng);
        });
        setStoreNgPharmacies(ngMap);
      }

      const { data: ngPharmacistsData } = await supabase
        .from('store_ng_pharmacists')
        .select('*');

      if (ngPharmacistsData) {
        const ngMap: { [pharmacyId: string]: any[] } = {};
        ngPharmacistsData.forEach((ng: any) => {
          if (!ngMap[ng.pharmacy_id]) {
            ngMap[ng.pharmacy_id] = [];
          }
          ngMap[ng.pharmacy_id].push(ng);
        });
        setStoreNgPharmacists(ngMap);
      }

      console.log('=== 全データ読み込み完了 ===');
      console.log('ユーザープロフィール数:', Object.keys(profilesMap || {}).length);
      console.log('シフト募集数:', safeLength(postingsData || []));
      console.log('シフト希望数:', safeLength(requestsData || []));
      console.log('確定シフト数:', safeLength(assignedData || []));

    } catch (err: any) {
      console.error('Error in loadAll:', err);
      setError(err?.message || 'データ読み込みエラー');
    } finally {
      setLoading(false);
    }
  }, [supabase, loadRecruitmentStatus]);

  /**
   * 募集ステータスを切り替える
   */
  const toggleRecruitmentStatus = useCallback(async () => {
    try {
      // 権限チェック
      const { data: authInfo } = await supabase.auth.getUser();
      const currentUserId = authInfo?.user?.id || user?.id;

      if (!currentUserId) {
        alert('ログイン情報を取得できません。再ログインしてください。');
        return;
      }

      const { data: me, error: meErr } = await supabase
        .from('user_profiles')
        .select('id,user_type,email')
        .eq('id', currentUserId)
        .maybeSingle();

      if (meErr) {
        console.error('管理者確認エラー:', meErr);
      }

      if (!me || me.user_type !== 'admin') {
        alert('この操作には管理者権限が必要です。');
        return;
      }

      const newStatus = !recruitmentStatus.is_open;
      const action = newStatus ? '再開' : '締切';

      // UPDATEを試行
      const { data: updatedRow, error } = await supabase
        .from('recruitment_status')
        .update({
          is_open: newStatus,
          notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
        })
        .eq('id', FIXED_RECRUITMENT_ID)
        .select('id,is_open,updated_at,notes');

      if (error) {
        console.error('募集状況更新エラー:', error);
        alert(`募集状況の更新に失敗しました: ${error.message}`);
        return;
      }

      if (!updatedRow || safeLength(updatedRow) === 0) {
        // レコードが存在しない場合はINSERT
        const { data: insertedRow, error: insertError } = await supabase
          .from('recruitment_status')
          .insert({
            id: FIXED_RECRUITMENT_ID,
            is_open: newStatus,
            notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
          })
          .select('id,is_open,updated_at,notes');

        if (insertError) {
          console.error('INSERTエラー:', insertError);
          alert(`募集状況の更新に失敗しました: ${insertError.message}`);
          return;
        }

        if (insertedRow && insertedRow[0]) {
          const finalData = insertedRow[0];
          setRecruitmentStatus(prev => ({
            ...prev,
            is_open: finalData.is_open,
            updated_at: finalData.updated_at,
            updated_by: finalData.updated_by,
            notes: finalData.notes
          }));
        }

        alert(`募集を${action}しました（新規作成）`);
        await loadRecruitmentStatus();
        return;
      }

      // 正常に更新された場合
      const updatedData = updatedRow[0];
      setRecruitmentStatus(prev => ({
        ...prev,
        is_open: updatedData.is_open,
        updated_at: updatedData.updated_at,
        updated_by: updatedData.updated_by,
        notes: updatedData.notes
      }));

      alert(`募集を${action}しました`);
      await loadRecruitmentStatus();

    } catch (error) {
      console.error('募集状況切り替えエラー:', error);
      alert(`募集状況の切り替えに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [supabase, user, recruitmentStatus, loadRecruitmentStatus]);

  // 初回読み込み
  useEffect(() => {
    reload();
  }, []); // 依存配列を空にして初回のみ実行

  return {
    requests,
    postings,
    assigned,
    userProfiles,
    ratings,
    storeNgPharmacists,
    storeNgPharmacies,
    recruitmentStatus,
    loading,
    error,
    reload,
    loadRecruitmentStatus,
    loadAssignedShifts,
    toggleRecruitmentStatus
  };
};
