import { useState, useEffect } from 'react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, supabase, pharmacistRatings } from '../lib/supabase';

export interface AdminDataState {
  assigned: any[];
  requests: any[];
  postings: any[];
  loading: boolean;
  systemStatus: string;
  lastUpdated: Date;
  userProfiles: any;
  storeNgPharmacists: {[pharmacyId: string]: any[]};
  storeNgPharmacies: {[pharmacistId: string]: any[]};
  ratings: any[];
}

export interface RecruitmentStatus {
  is_open: boolean;
  updated_at: string;
  updated_by: string | null;
  notes: string | null;
}

export const useAdminData = () => {
  const [assigned, setAssigned] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [postings, setPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [storeNgPharmacists, setStoreNgPharmacists] = useState<{[pharmacyId: string]: any[]}>({});
  const [storeNgPharmacies, setStoreNgPharmacies] = useState<{[pharmacistId: string]: any[]}>({});
  const [ratings, setRatings] = useState<any[]>([]);
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>({
    is_open: true,
    updated_at: '',
    updated_by: null,
    notes: null
  });

  const safeArray = (arr: any) => {
    if (!Array.isArray(arr)) {
      console.warn('Expected array but got:', typeof arr, arr);
      return [];
    }
    return arr;
  };

  const fetchShiftPostingsForDate = async (date: string) => {
    try {
      const { data, error } = await shiftPostings
        .select(`
          *,
          pharmacy:pharmacies(
            id,
            name,
            address,
            phone,
            email,
            store_ng_pharmacists
          )
        `)
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return safeArray(data);
    } catch (error) {
      console.error('Error fetching shift postings:', error);
      return [];
    }
  };

  const fetchShiftRequestsForDate = async (date: string) => {
    try {
      const { data, error } = await shiftRequests
        .select(`
          *,
          pharmacist:pharmacists(
            id,
            name,
            email,
            phone,
            address,
            store_ng_pharmacies
          )
        `)
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return safeArray(data);
    } catch (error) {
      console.error('Error fetching shift requests:', error);
      return [];
    }
  };

  const loadRecruitmentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('recruitment_status')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRecruitmentStatus(data);
      }
    } catch (error) {
      console.error('Error loading recruitment status:', error);
    }
  };

  const toggleRecruitmentStatus = async () => {
    try {
      const newStatus = !recruitmentStatus.is_open;
      const { error } = await supabase
        .from('recruitment_status')
        .upsert({
          is_open: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: 'admin',
          notes: newStatus ? '募集開始' : '募集停止'
        });

      if (error) throw error;

      setRecruitmentStatus(prev => ({
        ...prev,
        is_open: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: 'admin',
        notes: newStatus ? '募集開始' : '募集停止'
      }));
    } catch (error) {
      console.error('Error toggling recruitment status:', error);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      console.log('Loading all admin data...');

      // 並列でデータを取得
      const [
        assignedData,
        requestsData,
        postingsData,
        userProfilesData,
        ratingsData
      ] = await Promise.all([
        shifts.select('*').order('date', { ascending: true }),
        shiftRequests.select('*').order('date', { ascending: true }),
        shiftPostings.select('*').order('date', { ascending: true }),
        supabase.from('user_profiles').select('*'),
        pharmacistRatings.select('*')
      ]);

      // エラーチェック
      if (assignedData.error) throw assignedData.error;
      if (requestsData.error) throw requestsData.error;
      if (postingsData.error) throw postingsData.error;
      if (userProfilesData.error) throw userProfilesData.error;
      if (ratingsData.error) throw ratingsData.error;

      // データを安全に設定
      setAssigned(safeArray(assignedData.data));
      setRequests(safeArray(requestsData.data));
      setPostings(safeArray(postingsData.data));
      setUserProfiles(userProfilesData.data || {});
      setRatings(safeArray(ratingsData.data));

      // システムステータスを更新
      setSystemStatus('active');
      setLastUpdated(new Date());

      console.log('✅ All admin data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      setSystemStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedShifts = async () => {
    try {
      const { data, error } = await shifts
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setAssigned(safeArray(data));
    } catch (error) {
      console.error('Error loading assigned shifts:', error);
    }
  };

  const cleanupUndefinedData = async () => {
    try {
      console.log('🧹 Starting data cleanup...');
      
      // 未定義データのクリーンアップ
      const { error: requestsError } = await supabase
        .from('shift_requests')
        .delete()
        .is('pharmacist_id', null);

      const { error: postingsError } = await supabase
        .from('shift_postings')
        .delete()
        .is('pharmacy_id', null);

      if (requestsError) throw requestsError;
      if (postingsError) throw postingsError;

      console.log('✅ Data cleanup completed');
    } catch (error) {
      console.error('❌ Error during data cleanup:', error);
    }
  };

  // 初期化
  useEffect(() => {
    console.log('=== ADMIN DATA HOOK MOUNTED ===');
    loadAll();
    loadRecruitmentStatus();
  }, []);

  return {
    // State
    assigned,
    requests,
    postings,
    loading,
    systemStatus,
    lastUpdated,
    userProfiles,
    storeNgPharmacists,
    storeNgPharmacies,
    ratings,
    recruitmentStatus,
    
    // Setters
    setAssigned,
    setRequests,
    setPostings,
    setUserProfiles,
    setStoreNgPharmacists,
    setStoreNgPharmacies,
    setRatings,
    
    // Functions
    fetchShiftPostingsForDate,
    fetchShiftRequestsForDate,
    loadAll,
    loadAssignedShifts,
    loadRecruitmentStatus,
    toggleRecruitmentStatus,
    cleanupUndefinedData,
    safeArray
  };
};
