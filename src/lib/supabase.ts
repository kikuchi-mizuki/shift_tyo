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
      
      // upsertを使用して重複を自動的に処理
      const { data, error } = await supabase
        .from('assigned_shifts')
        .upsert(confirmedShiftsData, {
          onConflict: 'pharmacist_id,date,time_slot',
          ignoreDuplicates: false
        })
        .select();
      
      console.log('Supabase upsert result:', { data, error });
      
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
      console.log('Inserting into shift_requests table...');
      const { data, error } = await supabase
        .from('shift_requests')
        .insert(requestsData)
        .select();
      
      console.log('Insert result:', { data, error });
      
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
      // テーブル定義の相違に備えて、許可されたカラムだけを送る
      const sanitized = postingsData.map((p: any) => {
        // time_slot を既存スキーマに合わせて正規化
        const normalizedTimeSlot =
          p.time_slot === 'full' ? 'fullday' :
          p.time_slot === 'consult' ? 'negotiable' : p.time_slot;

        // カラム名の差異: required_staff / required_people のどちらでも受け入れられるように
        const requiredStaff =
          p.required_staff ?? p.required_people ?? 1;

        // ステータスの既定値 ('open' / 'recruiting') どちらでも運用できるように 'recruiting' を採用
        const status = p.status === 'open' ? 'recruiting' : (p.status || 'recruiting');

        // 送信カラムを制限（未知のカラムは除去: store_name など）
        return {
          pharmacy_id: p.pharmacy_id,
          date: p.date, // YYYY-MM-DD 文字列想定（date型に自動変換される）
          time_slot: normalizedTimeSlot,
          required_staff: requiredStaff,
          memo: p.memo ?? null,
          status
        };
      });

      const { data, error } = await supabase
        .from('shift_postings')
        .insert(sanitized)
        .select();
      
      console.log('Insert result:', { data, error });
      return { data: data || [], error };
      
    } catch (error) {
      console.error('Create postings error:', error);
      return { data: [], error };
    }
  }
};