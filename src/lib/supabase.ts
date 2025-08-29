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
  keyValue: supabaseAnonKey?.substring(0, 10) + '...'
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
      // Edge Function経由でデータを取得
      const apiUrl = `${supabaseUrl}/functions/v1/api/user_profiles`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
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

// シフト関連の関数
export const shifts = {
  // シフト取得
  getShifts: async (userId?: string, userType?: string) => {
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

  // 確定済みシフト作成
  createConfirmedShifts: async (confirmedShiftsData: any[]) => {
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      // 確定済みシフトをassigned_shiftsテーブルに保存
      const { data, error } = await supabase
        .from('assigned_shifts')
        .insert(confirmedShiftsData)
        .select();
      
      return { data: data || [], error };
    } catch (error) {
      console.error('Create confirmed shifts error:', error);
      return { data: [], error };
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
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      const { data, error } = await supabase
        .from('shift_requests')
        .insert(requestsData)
        .select();
      
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
    if (!supabase) {
      return { data: [], error: { message: 'Supabaseが設定されていません' } };
    }

    try {
      let query = supabase.from('shift_postings').select('*');
      
      if (userType === 'store' || userType === 'pharmacy') {
        query = query.eq('pharmacy_id', userId);
      }
      // pharmacist/adminは全ての募集を閲覧可能
      
      const { data, error } = await query;
      
      // テーブルが存在しない場合のエラーハンドリング
      if (error && (error.code === 'PGRST116' || error.message.includes('Could not find the table'))) {
        console.warn('shift_postings table not found, falling back to demo mode');
        return { data: [], error: { code: 'PGRST116', message: 'Table not found' } };
      }
      
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
      const { data, error } = await supabase
        .from('shift_postings')
        .insert(postingsData)
        .select();
      
      console.log('Insert result:', { data, error });
      return { data: data || [], error };
    } catch (error) {
      console.error('Create postings error:', error);
      return { data: [], error };
    }
  }
};