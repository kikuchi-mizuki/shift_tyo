/**
 * PostingRequestService.ts
 * 募集・希望のCRUD操作を管理するサービス
 *
 * AdminDashboard.tsxから抽出された募集・希望管理関連のビジネスロジック
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 新しいシフト募集を追加する
 *
 * @param posting - 募集データ
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const addPosting = async (
  posting: {
    pharmacy_id: string;
    date: string;
    time_slot?: string;
    start_time?: string;
    end_time?: string;
    required_staff?: number;
    store_name?: string;
    memo?: string;
  },
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const postingData = {
      ...posting,
      status: 'open',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('shift_postings')
      .insert([postingData])
      .select();

    if (error) {
      return { success: false, message: `募集追加エラー: ${error.message}` };
    }

    return { success: true, data };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * シフト募集を削除する
 *
 * @param postingId - 募集ID
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const deletePosting = async (
  postingId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { error } = await supabase
      .from('shift_postings')
      .delete()
      .eq('id', postingId);

    if (error) {
      return { success: false, message: `募集削除エラー: ${error.message}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * 新しいシフト希望を追加する
 *
 * @param request - 希望データ
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const addRequest = async (
  request: {
    pharmacist_id: string;
    date: string;
    time_slot?: string;
    start_time?: string;
    end_time?: string;
    priority?: string;
    memo?: string;
  },
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const requestData = {
      ...request,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('shift_requests')
      .insert([requestData])
      .select();

    if (error) {
      return { success: false, message: `希望追加エラー: ${error.message}` };
    }

    return { success: true, data };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * シフト希望を削除する
 *
 * @param requestId - 希望ID
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const deleteRequest = async (
  requestId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { error } = await supabase
      .from('shift_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      return { success: false, message: `希望削除エラー: ${error.message}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * シフト募集を更新する
 *
 * @param postingId - 募集ID
 * @param updates - 更新データ
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const updatePosting = async (
  postingId: string,
  updates: Partial<{
    date: string;
    time_slot: string;
    start_time: string;
    end_time: string;
    required_staff: number;
    store_name: string;
    status: string;
    memo: string;
  }>,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const { data, error } = await supabase
      .from('shift_postings')
      .update(updates)
      .eq('id', postingId)
      .select();

    if (error) {
      return { success: false, message: `募集更新エラー: ${error.message}` };
    }

    return { success: true, data };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * シフト希望を更新する
 *
 * @param requestId - 希望ID
 * @param updates - 更新データ
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const updateRequest = async (
  requestId: string,
  updates: Partial<{
    date: string;
    time_slot: string;
    start_time: string;
    end_time: string;
    priority: string;
    status: string;
    memo: string;
  }>,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const { data, error } = await supabase
      .from('shift_requests')
      .update(updates)
      .eq('id', requestId)
      .select();

    if (error) {
      return { success: false, message: `希望更新エラー: ${error.message}` };
    }

    return { success: true, data };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};
