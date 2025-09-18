import { createClient } from '@supabase/supabase-js';

// 環境変数の取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 本番環境かどうかの判定
export const isProduction = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key');

// 環境変数の確認
console.log('Supabase config:', {
  url: supabaseUrl ? 'SET' : 'NOT SET',
  key: supabaseAnonKey ? 'SET' : 'NOT SET',
  urlValue: supabaseUrl?.substring(0, 20) + '...',
  keyValue: supabaseAnonKey?.substring(0, 10) + '...',
  isProduction: !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key'),
  actualUrl: supabaseUrl,
  actualKey: supabaseAnonKey?.substring(0, 20) + '...'
});

// Supabaseクライアントの作成（シンプル版）
export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseAnonKey || 'your-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

console.log('Supabase client created:', !!supabase);

// 認証関連のヘルパー関数
export const auth = {
  // ログイン
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.warn('Auth error:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Auth error:', error);
      return { data: null, error: { message: 'ログインに失敗しました' } };
    }
  },

  // サインアップ
  signUp: async (email: string, password: string, userData: any) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    // email/passwordの検証
    if (!email || !password) {
      return { data: null, error: { message: 'emailまたはpasswordが空です' } };
    }

    // email/passwordの検証
    if (!email || !password) {
      return { data: null, error: { message: 'emailまたはpasswordが空です' } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        console.warn('SignUp error:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { data: null, error: { message: '新規登録に失敗しました' } };
    }
  },

  // ログアウト
  signOut: async () => {
    if (!supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('SignOut error:', error);
      return { error: { message: 'ログアウトに失敗しました' } };
    }
  },

  // 現在のユーザー取得
  getCurrentUser: async () => {
    if (!supabase) {
      return { data: { user: null } };
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      
      // Handle session not found errors
      if (error && (error.message.includes('session_not_found') || error.message.includes('Session from session_id'))) {
        console.warn('Stale session detected, clearing auth data');
        await supabase.auth.signOut();
        return { data: { user: null }, error: null };
      }
      
      return { data, error };
    } catch (error) {
      console.error('Get user error:', error);
      // If it's a session error, try to clear the session
      if (error instanceof Error && error.message.includes('session')) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn('Failed to clear stale session:', signOutError);
        }
      }
      return { data: { user: null }, error };
    }
  },

  // 認証状態の監視
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  },

  // ユーザーメタデータ更新（user_type等を補完保存）
  updateUserMetadata: async (data: Record<string, any>) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }
    try {
      const { data: res, error } = await supabase.auth.updateUser({ data });
      return { data: res, error };
    } catch (error) {
      console.error('Update user metadata error:', error);
      return { data: null, error } as any;
    }
  }
};

// ユーザープロファイル関連の関数
export const userProfiles = {
  // プロフィール取得（0件でもエラーにしない）
  getProfile: async (userId: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // 現在のセッションから認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseAnonKey;
      
      console.log('Edge Function request details:', {
        apiUrl: `${supabaseUrl}/functions/v1/api/user_profiles`,
        hasSession: !!session,
        hasAuthToken: !!authToken,
        tokenPrefix: authToken?.substring(0, 20) + '...'
      });
      
      // Edge Function経由でデータを取得
      const apiUrl = `${supabaseUrl}/functions/v1/api/user_profiles`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: errorData.error || { message: 'API request failed' } };
      }
      
      const result = await response.json();
      const data = result.data || [];
      
      // 指定されたユーザーIDのプロファイルを検索
      const userProfile = data.find((profile: any) => profile.id === userId) || null;
      
      return { data: userProfile, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { data: null, error };
    }
  },

  // プロフィール作成（存在しない場合）
  createProfile: async (userId: string, userData: any) => {
    // Profile creation disabled due to database view restrictions
    console.warn('Profile creation is disabled due to database view restrictions');
    return { data: null, error: { message: 'Profile creation is disabled due to database view restrictions' } };
  },

  // プロフィール更新
  updateProfile: async (userId: string, updates: any) => {
    // Update operations disabled due to database view restrictions
    console.warn('Profile updates are disabled due to database view restrictions');
    return { data: null, error: { message: 'Profile updates are not supported' } };
  },

  // NGリスト更新
  updateNGList: async (userId: string, ngList: string[]) => {
    // Update operations disabled due to database view restrictions
    console.warn('NG list updates are disabled due to database view restrictions');
    return { data: null, error: { message: 'NG list updates are not supported' } };
  }
};

// テーブル存在チェック用のキャッシュ
let tableExistsCache: {[tableName: string]: boolean} = {};

// テーブル存在チェック関数
const checkTableExists = async (tableName: string): Promise<boolean> => {
  if (tableExistsCache[tableName] !== undefined) {
    return tableExistsCache[tableName];
  }

  if (!supabase) {
    return false;
  }

  try {
    // テーブル存在チェック用の簡単なクエリ
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    const exists = !error || error.code !== 'PGRST116';
    tableExistsCache[tableName] = exists;
    
    console.log(`Table ${tableName} exists:`, exists);
    return exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    tableExistsCache[tableName] = false;
    return false;
  }
};

// 店舗毎のNG薬剤師管理
export const storeNgPharmacists = {
  // 店舗毎のNG薬剤師リストを取得
  getStoreNgPharmacists: async (pharmacyId: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    // テーブル存在チェック
    const tableExists = await checkTableExists('store_ng_pharmacists');
    if (!tableExists) {
      console.warn('store_ng_pharmacists table does not exist, returning empty data');
      return { data: [], error: null };
    }

    try {
      console.log('Attempting to fetch store NG pharmacists for pharmacy_id:', pharmacyId);
      const { data, error } = await supabase
        .from('store_ng_pharmacists')
        .select(`
          *,
          pharmacist:pharmacist_id (
            id,
            name,
            email
          )
        `)
        .eq('pharmacy_id', pharmacyId);

      if (error) {
        console.error('Error fetching store NG pharmacists:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          pharmacy_id: pharmacyId
        });
        
        // テーブルが存在しない場合のエラーハンドリング
        if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
          console.warn('store_ng_pharmacists table not found, returning empty data');
          tableExistsCache['store_ng_pharmacists'] = false;
          return { data: [], error: null };
        }
        
        return { data: null, error };
      }

      console.log('Store NG pharmacists fetched successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getStoreNgPharmacists:', error);
      return { data: null, error: { message: '店舗毎のNG薬剤師リストの取得に失敗しました' } };
    }
  },

  // 店舗毎のNG薬剤師を追加
  addStoreNgPharmacist: async (pharmacyId: string, storeName: string, pharmacistId: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase
        .from('store_ng_pharmacists')
        .insert({
          pharmacy_id: pharmacyId,
          store_name: storeName,
          pharmacist_id: pharmacistId
        })
        .select();

      if (error) {
        console.error('Error adding store NG pharmacist:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception in addStoreNgPharmacist:', error);
      return { data: null, error: { message: '店舗毎のNG薬剤師の追加に失敗しました' } };
    }
  },

  // 店舗毎のNG薬剤師を削除
  removeStoreNgPharmacist: async (pharmacyId: string, storeName: string, pharmacistId: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { error } = await supabase
        .from('store_ng_pharmacists')
        .delete()
        .eq('pharmacy_id', pharmacyId)
        .eq('store_name', storeName)
        .eq('pharmacist_id', pharmacistId);

      if (error) {
        console.error('Error removing store NG pharmacist:', error);
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Exception in removeStoreNgPharmacist:', error);
      return { data: null, error: { message: '店舗毎のNG薬剤師の削除に失敗しました' } };
    }
  },

  // 店舗毎のNG薬剤師を一括更新
  updateStoreNgPharmacists: async (pharmacyId: string, storeNgLists: {[storeName: string]: string[]}) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // 既存の店舗毎NG薬剤師を削除
      const { error: deleteError } = await supabase
        .from('store_ng_pharmacists')
        .delete()
        .eq('pharmacy_id', pharmacyId);

      if (deleteError) {
        console.error('Error deleting existing store NG pharmacists:', deleteError);
        return { data: null, error: deleteError };
      }

      // 新しい店舗毎NG薬剤師を追加
      const insertData = Object.entries(storeNgLists).flatMap(([storeName, pharmacistIds]) =>
        pharmacistIds.map(pharmacistId => ({
          pharmacy_id: pharmacyId,
          store_name: storeName,
          pharmacist_id: pharmacistId
        }))
      );

      if (insertData.length > 0) {
        const { data, error } = await supabase
          .from('store_ng_pharmacists')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Error inserting store NG pharmacists:', error);
          return { data: null, error };
        }
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Exception in updateStoreNgPharmacists:', error);
      return { data: null, error: { message: '店舗毎のNG薬剤師の更新に失敗しました' } };
    }
  }
};

// 薬剤師の店舗毎NG薬局設定
export const storeNgPharmacies = {
  // 薬剤師の店舗毎NG薬局設定を取得
  getStoreNgPharmacies: async (pharmacistId: string) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    // テーブル存在チェック
    const tableExists = await checkTableExists('store_ng_pharmacies');
    if (!tableExists) {
      console.warn('store_ng_pharmacies table does not exist, returning empty data');
      return { data: [], error: null };
    }

    try {
      console.log('Attempting to fetch store NG pharmacies for pharmacist_id:', pharmacistId);
      const { data, error } = await supabase
        .from('store_ng_pharmacies')
        .select('*')
        .eq('pharmacist_id', pharmacistId);

      if (error) {
        console.error('Error fetching store NG pharmacies:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          pharmacist_id: pharmacistId
        });
        
        // テーブルが存在しない場合のエラーハンドリング
        if (error.code === 'PGRST116' || error.message.includes('Could not find the table')) {
          console.warn('store_ng_pharmacies table not found, returning empty data');
          tableExistsCache['store_ng_pharmacies'] = false;
          return { data: [], error: null };
        }
        
        return { data: [], error };
      }

      console.log('Store NG pharmacies fetched successfully:', data);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception in getStoreNgPharmacies:', error);
      return { data: [], error: { message: '店舗毎のNG薬局の取得に失敗しました' } };
    }
  },

  // 薬剤師の店舗毎NG薬局設定を更新
  updateStoreNgPharmacies: async (pharmacistId: string, storeNgLists: {[pharmacyId: string]: {[storeName: string]: boolean}}) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // 既存の設定を削除
      const { error: deleteError } = await supabase
        .from('store_ng_pharmacies')
        .delete()
        .eq('pharmacist_id', pharmacistId);

      if (deleteError) {
        console.error('Error deleting existing store NG pharmacies:', deleteError);
        return { data: null, error: deleteError };
      }

      // 新しい設定を挿入
      const insertData: any[] = [];
      Object.entries(storeNgLists).forEach(([pharmacyId, storeList]) => {
        Object.entries(storeList).forEach(([storeName, isNg]) => {
          if (isNg) {
            insertData.push({
              pharmacist_id: pharmacistId,
              pharmacy_id: pharmacyId,
              store_name: storeName
            });
          }
        });
      });

      if (insertData.length > 0) {
        const { error: insertError } = await supabase
          .from('store_ng_pharmacies')
          .insert(insertData);

        if (insertError) {
          console.error('Error inserting store NG pharmacies:', insertError);
          return { data: null, error: insertError };
        }
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Exception in updateStoreNgPharmacies:', error);
      return { data: null, error: { message: '店舗毎のNG薬局の更新に失敗しました' } };
    }
  }
};

// シフト関連の関数
export const shifts = {
  // シフト取得
  getShifts: async (userId?: string, userType?: string) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // 現在のセッションから認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseAnonKey;
      
      console.log('Edge Function request details (assigned_shifts):', {
        apiUrl: `${supabaseUrl}/functions/v1/api/assigned_shifts`,
        hasSession: !!session,
        hasAuthToken: !!authToken,
        tokenPrefix: authToken?.substring(0, 20) + '...'
      });
      
      // Edge Function経由でデータを取得
      const apiUrl = `${supabaseUrl}/functions/v1/api/assigned_shifts`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { data: [], error: errorData.error || { message: 'API request failed' } };
      }
      
      const result = await response.json();
      let data = result.data || [];
      
      // ユーザータイプに応じてフィルタリング（クライアント側）
      if (userId && userType) {
        if (userType === 'pharmacist') {
          data = data.filter((shift: any) => shift.pharmacist_id === userId);
        } else if (userType === 'store' || userType === 'pharmacy') {
          data = data.filter((shift: any) => shift.pharmacy_id === userId);
        }
        // adminの場合はフィルタリングなし
      }
      
      // テーブルが存在しない場合のエラーハンドリング
      if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST205')) {
        console.warn('assigned_shifts table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST116', message: 'Table not found' } };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Get shifts error:', error);
      return { data: [], error: { code: 'PGRST205', message: 'Table not found' } };
    }
  },

  getShiftsByUser: async (userId: string, userType: string) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // Edge Function経由でデータを取得
      const apiUrl = `${supabaseUrl}/functions/v1/api/assigned_shifts`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { data: [], error: errorData.error || { message: 'API request failed' } };
      }
      
      const result = await response.json();
      let data = result.data || [];
      
      // ユーザータイプに応じてフィルタリング
      if (userType === 'pharmacist') {
        data = data.filter((shift: any) => shift.pharmacist_id === userId);
      } else if (userType === 'store' || userType === 'pharmacy') {
        data = data.filter((shift: any) => shift.pharmacy_id === userId);
      }
      // adminの場合はフィルタリングなし
      
      // テーブルが存在しない場合のエラーハンドリング
      if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST205')) {
        console.warn('assigned_shifts table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST205', message: 'Table not found' } };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Get shifts error:', error);
      return { data: [], error: { code: 'PGRST205', message: 'Table not found' } };
    }
  },

  // シフト作成
  createShift: async (shiftData: any) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase
        .from('assigned_shifts')
        .insert([shiftData])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Create shift error:', error);
      return { data: null, error };
    }
  },

  // シフト更新
  updateShift: async (shiftId: string, updates: any) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase
        .from('assigned_shifts')
        .update(updates)
        .eq('id', shiftId)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Update shift error:', error);
      return { data: null, error };
    }
  },

  // 複数シフト作成
  createMultipleShifts: async (shiftsData: any[]) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase
        .from('assigned_shifts')
        .insert(shiftsData)
        .select();
      
      return { data: data || [], error };
    } catch (error) {
      console.error('Create multiple shifts error:', error);
      return { data: [], error };
    }
  },

  // 確定済みシフト取得
  getConfirmedShifts: async () => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // Edge Function経由でデータを取得
      const apiUrl = `${supabaseUrl}/functions/v1/api/assigned_shifts`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { data: [], error: errorData.error || { message: 'API request failed' } };
      }
      
      const result = await response.json();
      let data = result.data || [];
      
      // 確定済みシフトのみをフィルタリング（status = 'confirmed'）
      data = data.filter((shift: any) => shift.status === 'confirmed');
      
      // テーブルが存在しない場合のエラーハンドリング
      if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST205')) {
        console.warn('assigned_shifts table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST116', message: 'Table not found' } };
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Get confirmed shifts error:', error);
      return { data: [], error: { code: 'PGRST205', message: 'Table not found' } };
    }
  },

  // 確定済みシフト作成（upsert使用）
  createConfirmedShifts: async (confirmedShiftsData: any[]) => {
    console.log('=== createConfirmedShifts START ===');
    console.log('Input data:', confirmedShiftsData);
    console.log('Supabase client exists:', !!supabase);
    
    if (!supabase) {
      console.error('Supabase not initialized');
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      console.log('Preparing to upsert into assigned_shifts table...');
      console.log('Data to upsert:', JSON.stringify(confirmedShiftsData, null, 2));
      
      // 各シフトのstore_nameを詳細ログとデータ検証
      const toHHMMSS = (v?: string) => {
        if (!v) return v as any;
        if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
        if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
        return v;
      };
      const toRange = (slot: string) => {
        if (slot === 'morning') return { start_time: '09:00:00', end_time: '13:00:00' };
        if (slot === 'afternoon') return { start_time: '13:00:00', end_time: '18:00:00' };
        return { start_time: '09:00:00', end_time: '18:00:00' };
      };
      const validatedShifts = confirmedShiftsData.map((shift, index) => {
        console.log(`Shift ${index}:`, {
          pharmacist_id: shift.pharmacist_id,
          pharmacy_id: shift.pharmacy_id,
          date: shift.date,
          time_slot: shift.time_slot,
          store_name: shift.store_name,
          memo: shift.memo,
          status: shift.status,
          store_name_type: typeof shift.store_name,
          store_name_length: shift.store_name ? shift.store_name.length : 0,
          memo_type: typeof shift.memo,
          memo_length: shift.memo ? shift.memo.length : 0
        });
        
        // store_nameが空の場合は、memoから抽出を試行
        let finalStoreName = shift.store_name;
        if (!finalStoreName && shift.memo) {
          const match = shift.memo.match(/\[store:([^\]]+)\]/);
          if (match && match[1]) {
            finalStoreName = match[1];
            console.log(`Extracted store_name from memo: ${finalStoreName}`);
          }
        }
        
        // 必須フィールドの検証
        if (!shift.pharmacist_id || !shift.pharmacy_id || !shift.date || !shift.time_slot) {
          console.error('Invalid shift data - missing required fields:', shift);
          return null;
        }
        
        // 時間の補完・正規化
        let start_time = toHHMMSS(shift.start_time as any);
        let end_time = toHHMMSS(shift.end_time as any);
        if (!start_time || !end_time) {
          const r = toRange(shift.time_slot || 'full');
          start_time = r.start_time;
          end_time = r.end_time;
        }

        return {
          pharmacist_id: shift.pharmacist_id,
          pharmacy_id: shift.pharmacy_id,
          date: shift.date,
          time_slot: shift.time_slot,
          status: shift.status || 'confirmed',
          store_name: finalStoreName || null,
          memo: shift.memo || null,
          start_time,
          end_time
        };
      }).filter(shift => shift !== null); // 無効なデータを除外
      
      if (validatedShifts.length === 0) {
        console.error('No valid shifts to save');
        return { data: [], error: { message: '保存する有効なシフトがありません' } };
      }
      
      // まず既存のシフトを削除してから新規挿入
      // 同じ日付・薬剤師・薬局の組み合わせの既存シフトを削除
      for (const shift of validatedShifts) {
        await supabase
          .from('assigned_shifts')
          .delete()
          .eq('pharmacist_id', shift.pharmacist_id)
          .eq('pharmacy_id', shift.pharmacy_id)
          .eq('date', shift.date)
          .eq('time_slot', shift.time_slot);
      }
      
      // 新規シフトを挿入
      const { data, error } = await supabase
        .from('assigned_shifts')
        .insert(validatedShifts)
        .select('id, pharmacist_id, pharmacy_id, date, time_slot, start_time, end_time, status, store_name, memo');
      
      console.log('Supabase upsert result:', { data, error });
      
      // 保存されたデータのstore_name/timeを確認
      if (data && data.length > 0) {
        console.log('Saved data store_name values:');
        data.forEach((savedShift, index) => {
          console.log(`Saved shift ${index}:`, {
            id: savedShift.id,
            store_name: savedShift.store_name,
            memo: savedShift.memo,
            start_time: savedShift.start_time,
            end_time: savedShift.end_time,
            store_name_type: typeof savedShift.store_name,
            store_name_length: savedShift.store_name ? savedShift.store_name.length : 0,
            memo_type: typeof savedShift.memo,
            memo_length: savedShift.memo ? savedShift.memo.length : 0,
            all_columns: Object.keys(savedShift)
          });
        });
        // もしstart_time/end_timeがNULLで返ってきたものがあれば補完して更新
        const followups = (data as any[]).map((row: any) => {
          if (row?.start_time && row?.end_time) return null;
          const slot = row?.time_slot || 'full';
          const r = slot === 'morning'
            ? { start_time: '09:00:00', end_time: '13:00:00' }
            : slot === 'afternoon'
            ? { start_time: '13:00:00', end_time: '18:00:00' }
            : { start_time: '09:00:00', end_time: '18:00:00' };
          console.warn('Detected NULL times after insert (assigned_shifts), updating id:', row.id, r);
          return supabase
            .from('assigned_shifts')
            .update({ start_time: r.start_time, end_time: r.end_time })
            .eq('id', row.id)
            .select('id,start_time,end_time');
        }).filter(Boolean) as Promise<any>[];
        if (followups.length > 0) {
          await Promise.all(followups);
          console.log('Follow-up time updates for assigned_shifts completed');
        }
      }
      
      // テーブルが存在しない場合のエラーハンドリング
      if (error && (error.code === 'PGRST116' || error.message.includes('Could not find the table'))) {
        console.warn('assigned_shifts table not found');
        return { data: [], error: { code: 'PGRST116', message: 'assigned_shiftsテーブルが存在しません。Supabaseダッシュボードでテーブルを作成してください。' } };
      }
      
      // その他のエラーの詳細ログ
      if (error) {
        console.error('Detailed error info:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      }
      
      console.log('=== createConfirmedShifts END ===');
      return { data: data || [], error };
    } catch (error) {
      console.error('Create confirmed shifts exception:', error);
      console.log('=== createConfirmedShifts END (with exception) ===');
      return { data: [], error };
    }
  }
};

// テーブル接続テスト関数
export const testConnection = {
  testShiftRequestsTable: async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      console.log('Testing shift_requests table connection...');
      const { data, error } = await supabase
        .from('shift_requests')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('shift_requests table test failed:', error);
        return { success: false, error: error.message };
      }
      
      console.log('shift_requests table test successful');
      return { success: true, data };
    } catch (error) {
      console.error('shift_requests table test error:', error);
      return { success: false, error: 'Connection failed' };
    }
  },
  
  testShiftPostingsTable: async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      console.log('Testing shift_postings table connection...');
      const { data, error } = await supabase
        .from('shift_postings')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('shift_postings table test failed:', error);
        return { success: false, error: error.message };
      }
      
      console.log('shift_postings table test successful');
      return { success: true, data };
    } catch (error) {
      console.error('shift_postings table test error:', error);
      return { success: false, error: 'Connection failed' };
    }
  },
  
  testAssignedShiftsTable: async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      console.log('Testing assigned_shifts table connection...');
      const { data, error } = await supabase
        .from('assigned_shifts')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('assigned_shifts table test failed:', error);
        return { success: false, error: error.message };
      }
      
      console.log('assigned_shifts table test successful');
      return { success: true, data };
    } catch (error) {
      console.error('assigned_shifts table test error:', error);
      return { success: false, error: 'Connection failed' };
    }
  }
};

// シフト希望関連の関数
export const shiftRequests = {
  // シフト希望取得
  getRequests: async (userId: string, userType: string) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      let query = supabase.from('shift_requests').select('*');
      
      if (userType === 'pharmacist') {
        query = query.eq('pharmacist_id', userId);
      }
      // pharmacy/adminは全ての希望を閲覧可能
      
      const { data, error } = await query;
      return { data: data || [], error };
    } catch (error) {
      console.error('Get requests error:', error);
      return { data: [], error };
    }
  },

  // シフト希望作成
  createRequests: async (requestsData: any[]) => {
    console.log('shiftRequests.createRequests called with:', requestsData);
    
    if (!supabase) {
      console.error('Supabase not initialized');
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // サーバー側で時間帯を補完（クライアントから来ない場合の保険）
      const toHHMMSS = (v: string) => {
        if (!v) return v;
        if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
        if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
        return v;
      };
      const toRange = (slot: string) => {
        if (slot === 'morning') return { start_time: '09:00:00', end_time: '13:00:00' };
        if (slot === 'afternoon') return { start_time: '13:00:00', end_time: '18:00:00' };
        return { start_time: '09:00:00', end_time: '18:00:00' };
      };
      const normalized = (requestsData || []).map((r: any) => {
        let start_time = toHHMMSS(r?.start_time);
        let end_time = toHHMMSS(r?.end_time);
        if (!start_time || !end_time) {
          const range = toRange(r?.time_slot || 'full');
          start_time = range.start_time;
          end_time = range.end_time;
        }
        return { ...r, start_time, end_time };
      });
      console.log('Normalized requests payload:', normalized);
      console.log('Inserting into shift_requests table...');
      const { data, error } = await supabase
        .from('shift_requests')
        .insert(normalized)
        .select('id,start_time,end_time,time_slot');
      
      console.log('Insert result:', { data, error });
      
      // 万が一、DB側でstart_time/end_timeがNULLで保存された場合はフォローアップ更新
      if (!error && Array.isArray(data) && data.length > 0) {
        const followups = (data as any[]).map((row: any) => {
          const s = row?.start_time;
          const e = row?.end_time;
          if (s && e) return null; // 問題なし
          const slot = row?.time_slot || 'full';
          const range = slot === 'morning'
            ? { start_time: '09:00:00', end_time: '13:00:00' }
            : slot === 'afternoon'
            ? { start_time: '13:00:00', end_time: '18:00:00' }
            : { start_time: '09:00:00', end_time: '18:00:00' };
          console.warn('Detected NULL times after insert, issuing update for id:', row.id, range);
          return supabase
            .from('shift_requests')
            .update({ start_time: range.start_time, end_time: range.end_time })
            .eq('id', row.id)
            .select('id,start_time,end_time');
        }).filter(Boolean) as Promise<any>[];
        if (followups.length > 0) {
          await Promise.all(followups);
          console.log('Follow-up time updates completed');
        }
      }

      // テーブルが存在しない場合のエラーハンドリング
      if (error && (error.code === 'PGRST116' || error.message.includes('Could not find the table'))) {
        console.warn('shift_requests table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST116', message: 'shift_requestsテーブルが存在しません。Supabaseダッシュボードでテーブルを作成してください。' } };
      }
      
      return { data: data || [], error };
    } catch (error) {
      console.error('Create requests error:', error);
      return { data: [], error };
    }
  }
};

// シフト募集関連の関数
export const shiftPostings = {
  // シフト募集取得
  getPostings: async (userId: string, userType: string) => {
    console.log('=== getPostings START ===');
    console.log('userId:', userId, 'userType:', userType);
    
    if (!supabase) {
      console.error('Supabase not initialized');
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      let query = supabase.from('shift_postings').select('*');
      
      if (userType === 'store' || userType === 'pharmacy') {
        query = query.eq('pharmacy_id', userId);
        console.log('Filtering by pharmacy_id:', userId);
      }
      // pharmacist/adminは全ての募集を閲覧可能
      
      console.log('Executing query...');
      const { data, error } = await query;
      
      console.log('Query result:', { dataCount: data?.length || 0, error });
      console.log('Raw data:', data);
      
      // テーブルが存在しない場合のエラーハンドリング
      if (error && (error.code === 'PGRST116' || error.message.includes('Could not find the table'))) {
        console.warn('shift_postings table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST116', message: 'Table not found' } };
      }
      
      console.log('=== getPostings END ===');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Get postings error:', error);
      return { data: [], error: { code: 'PGRST116', message: 'Table not found' } };
    }
  },

  // シフト募集作成
  createPostings: async (postingsData: any[]) => {
    console.log('createPostings called with:', postingsData);
    
    if (!supabase) {
      console.error('Supabase not initialized');
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      console.log('Inserting into shift_postings table...');
      console.log('Original postingsData:', postingsData);
      
      // テーブル定義の相違に備えて、許可されたカラムだけを送る
      const sanitized = postingsData.map((p: any) => {
        // HH:MM も HH:MM:SS に正規化
        const toHHMMSS = (v?: string) => {
          if (!v) return v as any;
          if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
          if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
          return v;
        };
        // time_slotから時間範囲を補完
        const toRange = (slot: string) => {
          if (slot === 'morning') return { start_time: '09:00:00', end_time: '13:00:00' };
          if (slot === 'afternoon') return { start_time: '13:00:00', end_time: '18:00:00' };
          return { start_time: '09:00:00', end_time: '18:00:00' };
        };
        // time_slot を既存スキーマに合わせて正規化
        const normalizedTimeSlot =
          p.time_slot === 'full' ? 'fullday' :
          p.time_slot === 'consult' ? 'negotiable' : p.time_slot;

        // カラム名の差異: required_staff / required_people のどちらでも受け入れられるように
        const requiredStaff =
          p.required_staff ?? p.required_people ?? 1;

        // ステータスの既定値 ('open' / 'recruiting') どちらでも運用できるように 'recruiting' を採用
        const status = p.status === 'open' ? 'recruiting' : (p.status || 'recruiting');

        // start/end を補完・正規化
        let start_time = toHHMMSS(p.start_time);
        let end_time = toHHMMSS(p.end_time);
        if (!start_time || !end_time) {
          const r = toRange(p.time_slot || 'full');
          start_time = r.start_time;
          end_time = r.end_time;
        }

        // store_nameも保存するように修正
        return {
          pharmacy_id: p.pharmacy_id,
          date: p.date, // YYYY-MM-DD 文字列想定（date型に自動変換される）
          time_slot: normalizedTimeSlot,
          required_staff: requiredStaff,
          memo: p.memo ?? null,
          status,
          store_name: p.store_name ?? null,
          start_time,
          end_time
        };
      });

      console.log('Sanitized data to insert:', sanitized);

      const { data, error } = await supabase
        .from('shift_postings')
        .insert(sanitized)
        .select('id,start_time,end_time,time_slot');
      
      console.log('Insert result:', { data, error });
      // フォローアップ更新（NULLで返った場合）
      if (!error && Array.isArray(data) && data.length > 0) {
        const followups = (data as any[]).map((row: any) => {
          if (row?.start_time && row?.end_time) return null;
          const slot = row?.time_slot || 'full';
          const range = slot === 'morning'
            ? { start_time: '09:00:00', end_time: '13:00:00' }
            : slot === 'afternoon'
            ? { start_time: '13:00:00', end_time: '18:00:00' }
            : { start_time: '09:00:00', end_time: '18:00:00' };
          console.warn('Detected NULL times after insert (postings), issuing update for id:', row.id, range);
          return supabase
            .from('shift_postings')
            .update({ start_time: range.start_time, end_time: range.end_time })
            .eq('id', row.id)
            .select('id,start_time,end_time');
        }).filter(Boolean) as Promise<any>[];
        if (followups.length > 0) {
          await Promise.all(followups);
          console.log('Follow-up time updates for postings completed');
        }
      }
      return { data: data || [], error };
      
    } catch (error) {
      console.error('Create postings error:', error);
      return { data: [], error };
    }
  },

  // シフト募集更新
  updatePosting: async (postingId: string, updates: any) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    // createPostings と同様の正規化を適用
    const normalized: any = { ...updates };
    if (normalized.time_slot) {
      normalized.time_slot = normalized.time_slot === 'full' ? 'fullday' : normalized.time_slot;
      if (normalized.time_slot === 'consult') {
        normalized.time_slot = 'negotiable';
      }
    }
    if (normalized.required_people != null && normalized.required_staff == null) {
      normalized.required_staff = normalized.required_people;
      delete normalized.required_people;
    }

    try {
      const { data, error } = await supabase
        .from('shift_postings')
        .update(normalized)
        .eq('id', postingId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Update posting error:', error);
      return { data: null, error } as any;
    }
  }
};

// 管理者用：シフト希望の更新
export const shiftRequestsAdmin = {
  updateRequest: async (requestId: string, updates: any) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    const normalized: any = { ...updates };
    if (normalized.time_slot) {
      normalized.time_slot = normalized.time_slot === 'full' ? 'fullday' : normalized.time_slot;
      if (normalized.time_slot === 'consult') {
        normalized.time_slot = 'negotiable';
      }
    }

    try {
      const { data, error } = await supabase
        .from('shift_requests')
        .update(normalized)
        .eq('id', requestId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Update request error:', error);
      return { data: null, error } as any;
    }
  }
};

// システム状態管理
export const systemStatus = {
  // システム状態を取得
  getSystemStatus: async () => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // assigned_shiftsテーブルに確定済みシフトがあるかチェック
      const { data, error } = await supabase
        .from('assigned_shifts')
        .select('id')
        .eq('status', 'confirmed')
        .limit(1);

      if (error) {
        console.error('Error checking system status:', error);
        return { data: null, error };
      }

      // 確定済みシフトが1件でもあれば'confirmed'、なければ'pending'
      const status = data && data.length > 0 ? 'confirmed' : 'pending';
      return { data: { status }, error: null };
    } catch (error) {
      console.error('System status check error:', error);
      return { data: null, error } as any;
    }
  }
};