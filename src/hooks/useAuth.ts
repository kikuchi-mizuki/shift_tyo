import { useState, useEffect } from 'react';
import { auth, userProfiles, isProduction } from '../lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  user_type: 'pharmacist' | 'pharmacy' | 'admin';
  pharmacy_id?: string | null;
  specialties?: string[] | null;
  ng_list?: string[] | null;
};

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isProduction) { setLoading(false); return; }

    // Clear any stale session data on initialization
    const clearStaleSession = async () => {
      try {
        const { data } = await auth.getCurrentUser();
        if (!data?.user) {
          // Clear any stale session data
          await auth.signOut();
        }
      } catch (error) {
        console.warn('Session validation failed, clearing stale data:', error);
        await auth.signOut();
      }
    };

    // 既存セッション確認
    (async () => {
      try {
        await clearStaleSession();
        const { data } = await auth.getCurrentUser();
        if (data?.user) {
          setUser(data.user);
          await safeLoadProfile(data.user.id, data.user.email ?? '');
        }
      } catch (error) {
        console.warn('Initial session check failed:', error);
        // Clear any stale data and continue
        await auth.signOut();
      } finally {
        setLoading(false);
      }
    })();

    // 認証状態の購読（1つだけ）
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        setUser(session.user);
        await safeLoadProfile(session.user.id, session.user.email ?? '');
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // VIEW から読むだけ。0件なら仮プロフィールを組み立てる
  async function safeLoadProfile(userId: string, emailFallback: string) {
    try {
      console.log('Loading profile for user:', userId);

      // 10秒タイムアウトで確実に抜ける
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('profile timeout')), 10_000)
      );

      const req = userProfiles.getProfile(userId); // ← from('user_profiles').maybeSingle()
      const { data, error } = await Promise.race([req, timeout]) as any;

      if (error) {
        console.warn('Profile load error:', error);
      }

      if (data) {
        console.log('Profile loaded:', data);
        setUserProfile(data as Profile);
      } else {
        // プロファイルが存在しない場合は、auth.usersのメタデータから取得を試行
        console.log('Profile not found, checking auth metadata');
        try {
          const { data: authData } = await auth.getCurrentUser();
          const userMetadata = authData?.user?.user_metadata || {};
          const userType = userMetadata.user_type || userMetadata.role;
          const userName = userMetadata.name || emailFallback;
          
          console.log('User type from metadata (user_type):', userMetadata.user_type);
          console.log('User type from metadata (role):', userMetadata.role);
          console.log('User metadata:', userMetadata);
          console.log('Full auth user data:', authData?.user);
          
          // Determine user type with proper fallback
          let finalUserType = userMetadata.user_type || userMetadata.role || 'pharmacist';
          
          console.log('Final user type:', finalUserType);
          
          // Use metadata to create profile
          console.log('Using metadata for profile creation');
          
          setUserProfile({
            id: userId,
            name: userName,
            email: emailFallback,
            user_type: finalUserType as 'pharmacist' | 'pharmacy' | 'admin',
          });
        } catch (metaError) {
          console.warn('Failed to get metadata:', metaError);
          setUserProfile({
            id: userId,
            name: null,
            email: emailFallback,
            user_type: 'pharmacist', // デフォルト値
          });
        }
      }
    } catch (e) {
      console.warn('Profile load exception:', e);
      // 例外でもUIを進める
      setUserProfile({
        id: userId,
        name: null,
        email: emailFallback,
        user_type: 'pharmacist', // デフォルト値
      });
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isProduction) return { data: null, error: null };
    setLoading(true);
    try {
      const res = await auth.signIn(email, password);
      if (!res.error && res.data?.user) {
        setUser(res.data.user);
        await safeLoadProfile(res.data.user.id, res.data.user.email ?? '');
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    if (!isProduction) return { data: null, error: { message: 'デモ環境では新規登録はできません' } };
    setLoading(true);
    try {
      return await auth.signUp(email, password, userData);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      setUser(null);
      setUserProfile(null);
      return isProduction ? await auth.signOut() : (window.location.reload(), { error: null });
    } finally {
      setLoading(false);
    }
  };

  return { user, userProfile, loading, signIn, signUp, signOut };
};