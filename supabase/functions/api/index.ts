// supabase/functions/api/index.ts  (Edge Functions / Deno)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // server-only
);

const TABLES: Record<string, string> = {
  shift_postings: "shift_postings",
  shift_requests: "shift_requests",
  assigned_shifts: "assigned_shifts",
  user_profiles: "user_profiles",
};

function cors(req: Request, extra: Record<string, string> = {}) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    ...extra,
  };
}
function json(req: Request, body: unknown, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(req, extra) },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  // /functions/v1/api/<resource>?limit=&offset=
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const resource = parts[4];

  if (resource === "health") return new Response("ok", { headers: cors(req) });
  const table = TABLES[resource];
  if (!table) return json(req, { error: "not found" }, 404);

  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  let q = supabase.from(table).select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (["shift_postings", "shift_requests", "user_profiles"].includes(table)) {
    // @ts-ignore
    q = q.order("created_at", { ascending: false });
  }

  const { data, error, count } = await q;
  if (error) return json(req, { error }, 400);
  return json(req, { data, count }, 200, { "Cache-Control": "max-age=30, s-maxage=60" });
});