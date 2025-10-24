import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface UserSession {
  id: string;
  email: string;
  user_type: 'pharmacist' | 'pharmacy' | 'admin';
  name?: string;
  lastActive: Date;
}

interface MultiUserAuthContextType {
  activeSessions: UserSession[];
  currentUserType: 'pharmacist' | 'pharmacy' | 'admin' | null;
  switchUserType: (userType: 'pharmacist' | 'pharmacy' | 'admin') => void;
  addSession: (user: any, fallbackUserType?: 'pharmacist' | 'pharmacy' | 'admin') => Promise<void>;
  removeSession: (userType: 'pharmacist' | 'pharmacy' | 'admin') => void;
  getCurrentUser: () => UserSession | null;
  isLoggedIn: (userType: 'pharmacist' | 'pharmacy' | 'admin') => boolean;
}

const MultiUserAuthContext = createContext<MultiUserAuthContextType | undefined>(undefined);

export const useMultiUserAuth = () => {
  const context = useContext(MultiUserAuthContext);
  if (!context) {
    throw new Error('useMultiUserAuth must be used within a MultiUserAuthProvider');
  }
  return context;
};

interface MultiUserAuthProviderProps {
  children: ReactNode;
}

export const MultiUserAuthProvider: React.FC<MultiUserAuthProviderProps> = ({ children }) => {
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [currentUserType, setCurrentUserType] = useState<'pharmacist' | 'pharmacy' | 'admin' | null>(null);

  // ローカルストレージからセッション情報を復元
  useEffect(() => {
    try {
      console.log('MultiUserAuth: Loading sessions from localStorage');
      const savedSessions = localStorage.getItem('multi_user_sessions');
      const savedCurrentType = localStorage.getItem('current_user_type');
      
      console.log('MultiUserAuth: Saved data:', { 
        savedSessions: savedSessions ? 'EXISTS' : 'NULL',
        savedCurrentType: savedCurrentType || 'NULL'
      });
      
      if (savedSessions) {
        try {
          const sessions = JSON.parse(savedSessions).map((session: any) => ({
            ...session,
            lastActive: new Date(session.lastActive)
          }));
          setActiveSessions(sessions);
          console.log('MultiUserAuth: Loaded sessions:', sessions.length);
        } catch (error) {
          console.error('Error parsing saved sessions:', error);
        }
      }
      
      if (savedCurrentType) {
        setCurrentUserType(savedCurrentType as 'pharmacist' | 'pharmacy' | 'admin');
        console.log('MultiUserAuth: Set current user type:', savedCurrentType);
      }
    } catch (error) {
      console.error('MultiUserAuth: Error accessing localStorage:', error);
    }
  }, []);

  // Supabase認証状態の監視
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        // ログアウト時は全てのセッションをクリア
        setActiveSessions([]);
        setCurrentUserType(null);
        localStorage.removeItem('multi_user_sessions');
        localStorage.removeItem('current_user_type');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // セッション情報をローカルストレージに保存
  useEffect(() => {
    try {
      console.log('MultiUserAuth: Saving sessions to localStorage:', activeSessions.length);
      localStorage.setItem('multi_user_sessions', JSON.stringify(activeSessions));
    } catch (error) {
      console.error('MultiUserAuth: Error saving sessions to localStorage:', error);
    }
  }, [activeSessions]);

  useEffect(() => {
    if (currentUserType) {
      localStorage.setItem('current_user_type', currentUserType);
    }
  }, [currentUserType]);

  const addSession = async (user: any, fallbackUserType?: 'pharmacist' | 'pharmacy' | 'admin') => {
    try {
      console.log('MultiUserAuth: Adding session for user:', user.id);
      
      // ユーザープロフィールを取得（エラー時はフォールバックを使用）
      let userType = fallbackUserType;
      let userName = user.email;
      
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          userType = profile.user_type as 'pharmacist' | 'pharmacy' | 'admin';
          userName = profile.name || user.email;
          console.log('MultiUserAuth: Profile found:', { userType, name: userName });
        } else {
          console.warn('MultiUserAuth: Profile not found, using fallback:', { error: error?.message, fallbackUserType });
        }
      } catch (profileError) {
        console.warn('MultiUserAuth: Profile fetch failed, using fallback:', profileError);
      }

      if (!userType) {
        throw new Error('ユーザータイプが特定できませんでした');
      }
      
      const newSession: UserSession = {
        id: user.id,
        email: user.email,
        user_type: userType,
        name: userName,
        lastActive: new Date()
      };

      console.log('MultiUserAuth: Creating session:', newSession);

      // 単一セッション運用: 新しいログインで既存セッションを置き換える
      setActiveSessions([newSession]);

      // 直近でログインしたユーザータイプを現在のユーザータイプとして採用
      setCurrentUserType(userType);
      
      console.log('MultiUserAuth: Session added successfully');
    } catch (error) {
      console.error('MultiUserAuth: Error adding session:', error);
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
  };

  const removeSession = (userType: 'pharmacist' | 'pharmacy' | 'admin') => {
    setActiveSessions(prev => prev.filter(session => session.user_type !== userType));
    
    // 現在のユーザータイプが削除された場合、他のセッションに切り替え
    if (currentUserType === userType) {
      const remainingSessions = activeSessions.filter(session => session.user_type !== userType);
      if (remainingSessions.length > 0) {
        setCurrentUserType(remainingSessions[0].user_type);
      } else {
        setCurrentUserType(null);
      }
    }
  };

  const switchUserType = (userType: 'pharmacist' | 'pharmacy' | 'admin') => {
    const session = activeSessions.find(s => s.user_type === userType);
    if (session) {
      setCurrentUserType(userType);
      // アクティブ時間を更新
      setActiveSessions(prev => 
        prev.map(s => 
          s.user_type === userType 
            ? { ...s, lastActive: new Date() }
            : s
        )
      );
    }
  };

  const getCurrentUser = (): UserSession | null => {
    if (!currentUserType) return null;
    return activeSessions.find(session => session.user_type === currentUserType) || null;
  };

  const isLoggedIn = (userType: 'pharmacist' | 'pharmacy' | 'admin'): boolean => {
    return activeSessions.some(session => session.user_type === userType);
  };

  const value: MultiUserAuthContextType = {
    activeSessions,
    currentUserType,
    switchUserType,
    addSession,
    removeSession,
    getCurrentUser,
    isLoggedIn
  };

  return (
    <MultiUserAuthContext.Provider value={value}>
      {children}
    </MultiUserAuthContext.Provider>
  );
};
