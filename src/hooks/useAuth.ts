import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  user_type: 'pharmacist' | 'pharmacy' | 'admin' | 'store';
};

export const useAuth = () => {
  console.log('useAuth: Hook called');
  
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Initializing...');
    console.log('useAuth: Supabase client:', !!supabase);
    console.log('useAuth: Environment variables:', {
      url: !!import.meta.env.VITE_SUPABASE_URL,
      key: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    // シンプルな認証状態チェック
    const checkAuth = async () => {
      try {
        console.log('useAuth: Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Session check error:', error);
        }
        
        console.log('useAuth: Session result:', { session: !!session, user: !!session?.user });
        
        if (session?.user) {
          console.log('useAuth: User found, setting user and profile');
          setUser(session.user);
          await loadUserProfile(session.user);
        } else {
          console.log('useAuth: No user found');
        }
      } catch (error) {
        console.error('useAuth: Auth check error:', error);
      } finally {
        console.log('useAuth: Setting loading to false');
        setLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('useAuth: Auth state change:', event, { user: !!session?.user });
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('useAuth: User signed in');
        setUser(session.user);
        await loadUserProfile(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('useAuth: User signed out');
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('useAuth: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('useAuth: Loading user profile for:', authUser.id);
      console.log('useAuth: User metadata:', authUser.user_metadata);
      
      const meta = authUser.user_metadata || {};
      const userType = (meta.user_type || meta.role || 'pharmacist') as 'pharmacist' | 'pharmacy' | 'admin' | 'store';
      const name = meta.name || authUser.email || null;
      
      console.log('useAuth: Determined user type:', userType);
      
      setUserProfile({
        id: authUser.id,
        name,
        email: authUser.email ?? '',
        user_type: userType
      });
      
      console.log('useAuth: User profile set successfully');
    } catch (error) {
      console.error('useAuth: Error loading user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (!error && data.user) {
        setUser(data.user);
        await loadUserProfile(data.user);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: { message: 'ログインに失敗しました' } };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: { message: '新規登録に失敗しました' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: { message: 'ログアウトに失敗しました' } };
    } finally {
      setLoading(false);
    }
  };

  return { user, userProfile, loading, signIn, signUp, signOut };
};