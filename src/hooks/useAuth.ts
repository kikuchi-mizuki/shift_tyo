import { useState, useEffect } from 'react';
import { auth, isProduction } from '../lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  user_type: 'pharmacist' | 'pharmacy' | 'admin';
};

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isProduction) { setLoading(false); return; }

    const hardStop = setTimeout(() => setLoading(false), 8000);

    (async () => {
      try {
        const { data } = await auth.getCurrentUser();
        if (data?.user) {
          setUser(data.user);
          await loadFromAuthMetadata();
        }
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        setUser(session.user);
        try { await loadFromAuthMetadata(); } finally { setLoading(false); }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(hardStop); };
  }, []);

  async function loadFromAuthMetadata() {
    const { data: authData } = await auth.getCurrentUser();
    const authUser = authData?.user;
    const meta = authUser?.user_metadata || {};
    const finalType = (meta.user_type || meta.role || 'pharmacist') as 'pharmacist' | 'pharmacy' | 'admin';
    const name = meta.name || authUser?.email || null;
    // メタデータに未設定なら保存
    if (meta.user_type !== finalType) {
      await auth.updateUserMetadata({ user_type: finalType });
    }
    setUserProfile({ id: authUser.id, name, email: authUser.email ?? '', user_type: finalType });
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