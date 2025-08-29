// src/lib/api.ts – call Edge Function with ANON KEY (Vite/React)
const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

async function get(path: string, params?: Record<string, string | number>) {
  const qs = params
    ? `?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      )}`
    : "";
  const res = await fetch(`${base}/${path}${qs}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ data: any[]; count?: number }>;
}

export const api = {
  getShiftPostings: (p?: { limit?: number; offset?: number }) =>
    get("shift_postings", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getShiftRequests: (p?: { limit?: number; offset?: number }) =>
    get("shift_requests", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getAssignedShifts: (p?: { limit?: number; offset?: number }) =>
    get("assigned_shifts", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
  getUserProfiles: (p?: { limit?: number; offset?: number }) =>
    get("user_profiles", { limit: p?.limit ?? 50, offset: p?.offset ?? 0 }),
};