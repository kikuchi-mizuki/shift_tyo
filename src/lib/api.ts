// src/lib/api.ts – Direct Supabase client calls (JWT認証エラー回避)
import { supabase, waitForSupabase } from './supabase';

async function getDirect(tableName: string, params?: Record<string, string | number>) {
  // Supabaseクライアントが利用可能になるまで待つ
  const isReady = await waitForSupabase();
  if (!isReady) {
    throw new Error('Supabase client not available after waiting');
  }
  
  let query = supabase.from(tableName).select('*');
  
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return { data: data || [], count: data?.length };
}

export const api = {
  getShiftPostings: (p?: { limit?: number; offset?: number }) =>
    getDirect("shift_postings", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getShiftRequests: (p?: { limit?: number; offset?: number }) =>
    getDirect("shift_requests", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getAssignedShifts: (p?: { limit?: number; offset?: number }) =>
    getDirect("assigned_shifts", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getUserProfiles: (p?: { limit?: number; offset?: number }) =>
    getDirect("user_profiles", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
};