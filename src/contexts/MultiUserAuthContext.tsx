import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage, safeSetLocalStorageJSON, safeGetLocalStorageJSON } from '../utils/storage';

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

  // セッションデータのバージョン（古いデータを自動クリアするため）
  const SESSION_VERSION = '2.0'; // デモアカウント修正後のバージョン

  // UUIDの妥当性チェック
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // ローカルストレージからセッション情報を復元
  useEffect(() => {
    try {
      const savedSessions = safeGetLocalStorage('multi_user_sessions');
      const savedCurrentType = safeGetLocalStorage('current_user_type');
      const savedVersion = safeGetLocalStorage('session_version');

      // バージョンが古い場合は全てクリア
      if (savedVersion !== SESSION_VERSION) {
        console.warn('MultiUserAuth: Session version mismatch, clearing all sessions');
        safeRemoveLocalStorage('multi_user_sessions');
        safeRemoveLocalStorage('current_user_type');
        safeSetLocalStorage('session_version', SESSION_VERSION);
        return;
      }

      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions);

          // 無効なUUIDを持つセッションを除外
          const validSessions = parsedSessions.filter((session: any) => {
            const isValid = isValidUUID(session.id);
            if (!isValid) {
              console.warn(`MultiUserAuth: Invalid UUID detected, skipping session: ${session.id}`);
            }
            return isValid;
          }).map((session: any) => ({
            ...session,
            lastActive: new Date(session.lastActive)
          }));

          setActiveSessions(validSessions);
        } catch (error) {
          console.error('Error parsing saved sessions:', error);
          // パースエラーの場合はクリア
          safeRemoveLocalStorage('multi_user_sessions');
          safeRemoveLocalStorage('current_user_type');
        }
      }

      if (savedCurrentType) {
        setCurrentUserType(savedCurrentType as 'pharmacist' | 'pharmacy' | 'admin');
      }

      // バージョンを保存
      safeSetLocalStorage('session_version', SESSION_VERSION);
    } catch (error) {
      console.error('MultiUserAuth: Error accessing localStorage:', error);
    }
  }, []);

  // Supabase認証状態の監視
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // ログアウト時は全てのセッションをクリア
        setActiveSessions([]);
        setCurrentUserType(null);
        safeRemoveLocalStorage('multi_user_sessions');
        safeRemoveLocalStorage('current_user_type');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // セッション情報をローカルストレージに保存
  useEffect(() => {
    safeSetLocalStorageJSON('multi_user_sessions', activeSessions);
  }, [activeSessions]);

  useEffect(() => {
    if (currentUserType) {
      safeSetLocalStorage('current_user_type', currentUserType);
    }
  }, [currentUserType]);

  const addSession = async (user: any, fallbackUserType?: 'pharmacist' | 'pharmacy' | 'admin') => {
    try {
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

      // 単一セッション運用: 新しいログインで既存セッションを置き換える
      setActiveSessions([newSession]);

      // 直近でログインしたユーザータイプを現在のユーザータイプとして採用
      setCurrentUserType(userType);
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
