import { useState, useEffect } from 'react';
import { auth, isProduction } from '../lib/supabase';

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
    // 開発環境ではローディングを無効化
    if (!isProduction) { 
      setLoading(false); 
      return; 
    }

    const hardStop = setTimeout(() => {
      console.log('Hard stop timeout reached, forcing loading to false');
      setLoading(false);
    }, 5000); // 5秒でタイムアウト

    (async () => {
      try {
        console.log('Checking current user...');
        const { data } = await auth.getCurrentUser();
        console.log('Current user result:', data);
        
        if (data?.user) {
          console.log('User found, setting user and loading profile');
          setUser(data.user);
          await loadFromAuthMetadata();
        } else {
          console.log('No user found');
        }
      } catch (error) {
        console.error('Error in auth effect:', error);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    })();

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        setUser(session.user);
        try { 
          await loadFromAuthMetadata(); 
        } catch (error) {
          console.error('Error loading auth metadata:', error);
        } finally { 
          setLoading(false); 
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => { 
      subscription.unsubscribe(); 
      clearTimeout(hardStop); 
    };
  }, []);

  async function loadFromAuthMetadata() {
    try {
      console.log('Loading from auth metadata...');
      const { data: authData } = await auth.getCurrentUser();
      const authUser = authData?.user;
      
      if (!authUser) {
        console.error('No auth user found in loadFromAuthMetadata');
        return;
      }
      
      const meta = authUser?.user_metadata || {};
      const finalType = (meta.user_type || meta.role || 'pharmacist') as 'pharmacist' | 'pharmacy' | 'admin' | 'store';
      const name = meta.name || authUser?.email || null;
      
      console.log('loadFromAuthMetadata debug:', {
        meta,
        finalType,
        authUser: authUser?.id
      });
      
      // メタデータに未設定なら保存
      if (meta.user_type !== finalType) {
        console.log('Updating user metadata:', { old: meta.user_type, new: finalType });
        await auth.updateUserMetadata({ user_type: finalType });
      }
      
      setUserProfile({ id: authUser.id, name, email: authUser.email ?? '', user_type: finalType });
      console.log('User profile set successfully');
    } catch (error) {
      console.error('Error in loadFromAuthMetadata:', error);
      // エラーが発生してもローディングを止める
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isProduction) return { data: null, error: null };
    setLoading(true);
    try {
      const res = await auth.signIn(email, password);
      if (!res.error && res.data?.user) {
        setUser(res.data.user);
        await loadFromAuthMetadata();
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
      return await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return { user, userProfile, loading, signIn, signUp, signOut };
};