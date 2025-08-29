import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  user_type: 'pharmacist' | 'pharmacy' | 'admin' | 'store';
};

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // シンプルな認証状態チェック
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      const meta = authUser.user_metadata || {};
      const userType = (meta.user_type || meta.role || 'pharmacist') as 'pharmacist' | 'pharmacy' | 'admin' | 'store';
      const name = meta.name || authUser.email || null;
      
      setUserProfile({
        id: authUser.id,
        name,
        email: authUser.email ?? '',
        user_type: userType
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
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