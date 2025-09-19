// src/lib/api.ts – DISABLED: Edge Function calls causing 400 errors
// This file is disabled to prevent 400 Bad Request errors from Edge Functions
// All API calls now use direct Supabase client instead

console.warn('api.ts is disabled - using direct Supabase client instead');

export const api = {
  getShiftPostings: () => {
    console.warn('getShiftPostings is disabled - use direct Supabase client');
    return Promise.resolve({ data: [], count: 0 });
  },
  getShiftRequests: () => {
    console.warn('getShiftRequests is disabled - use direct Supabase client');
    return Promise.resolve({ data: [], count: 0 });
  },
  getAssignedShifts: () => {
    console.warn('getAssignedShifts is disabled - use direct Supabase client');
    return Promise.resolve({ data: [], count: 0 });
  },
  getUserProfiles: () => {
    console.warn('getUserProfiles is disabled - use direct Supabase client');
    return Promise.resolve({ data: [], count: 0 });
  },
};