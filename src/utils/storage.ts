/**
 * storage.ts
 * localStorage/sessionStorageの安全なラッパー関数
 * エラーハンドリングとセキュリティ対策を提供
 */

/**
 * localStorageに安全に値を保存
 * @param key - 保存するキー
 * @param value - 保存する値
 * @returns 成功した場合true、失敗した場合false
 */
export const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[Storage] localStorage is not available');
      return false;
    }

    // キーの検証
    if (!key || typeof key !== 'string') {
      console.error('[Storage] Invalid key:', key);
      return false;
    }

    // 値のサイズチェック（5MBまで）
    const size = new Blob([value]).size;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (size > MAX_SIZE) {
      console.error('[Storage] Value too large:', size, 'bytes');
      return false;
    }

    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError等のエラーをハンドリング
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        console.error('[Storage] localStorage quota exceeded');
      } else {
        console.error('[Storage] Failed to set localStorage:', error.message);
      }
    } else {
      console.error('[Storage] Failed to set localStorage:', error);
    }
    return false;
  }
};

/**
 * localStorageから安全に値を取得
 * @param key - 取得するキー
 * @returns 値、または取得失敗時はnull
 */
export const safeGetLocalStorage = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    if (!key || typeof key !== 'string') {
      console.error('[Storage] Invalid key:', key);
      return null;
    }

    return localStorage.getItem(key);
  } catch (error) {
    console.error('[Storage] Failed to get localStorage:', error);
    return null;
  }
};

/**
 * localStorageから安全に値を削除
 * @param key - 削除するキー
 * @returns 成功した場合true、失敗した場合false
 */
export const safeRemoveLocalStorage = (key: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    if (!key || typeof key !== 'string') {
      console.error('[Storage] Invalid key:', key);
      return false;
    }

    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to remove localStorage:', error);
    return false;
  }
};

/**
 * sessionStorageに安全に値を保存
 * @param key - 保存するキー
 * @param value - 保存する値
 * @returns 成功した場合true、失敗した場合false
 */
export const safeSetSessionStorage = (key: string, value: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      console.warn('[Storage] sessionStorage is not available');
      return false;
    }

    if (!key || typeof key !== 'string') {
      console.error('[Storage] Invalid key:', key);
      return false;
    }

    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to set sessionStorage:', error);
    return false;
  }
};

/**
 * sessionStorageから安全に値を取得
 * @param key - 取得するキー
 * @returns 値、または取得失敗時はnull
 */
export const safeGetSessionStorage = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    if (!key || typeof key !== 'string') {
      console.error('[Storage] Invalid key:', key);
      return null;
    }

    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('[Storage] Failed to get sessionStorage:', error);
    return null;
  }
};

/**
 * JSON形式でlocalStorageに安全に保存
 * @param key - 保存するキー
 * @param value - 保存する値（オブジェクト）
 * @returns 成功した場合true、失敗した場合false
 */
export const safeSetLocalStorageJSON = <T>(key: string, value: T): boolean => {
  try {
    const jsonString = JSON.stringify(value);
    return safeSetLocalStorage(key, jsonString);
  } catch (error) {
    console.error('[Storage] Failed to stringify value:', error);
    return false;
  }
};

/**
 * JSON形式でlocalStorageから安全に取得
 * @param key - 取得するキー
 * @returns パースされた値、または取得/パース失敗時はnull
 */
export const safeGetLocalStorageJSON = <T>(key: string): T | null => {
  try {
    const jsonString = safeGetLocalStorage(key);
    if (!jsonString) {
      return null;
    }

    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[Storage] Failed to parse JSON:', error);
    return null;
  }
};
