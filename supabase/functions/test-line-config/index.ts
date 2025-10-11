import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabaseクライアント作成
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // LINE Channel Access Tokenの確認
    const lineChannelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    
    // ユーザープロファイルの確認
    const { data: users, error: usersError } = await supabaseClient
      .from("user_profiles")
      .select("id, name, line_user_id, line_notification_enabled, user_type")
      .eq("user_type", "pharmacist")
      .not("line_user_id", "is", null);

    const linkedUsers = users?.filter(u => u.line_user_id && u.line_user_id.trim() !== '') || [];

    return new Response(
      JSON.stringify({
        success: true,
        config: {
          lineChannelAccessToken: !!lineChannelAccessToken,
          lineChannelAccessTokenLength: lineChannelAccessToken?.length || 0,
          supabaseUrl: !!Deno.env.get("SUPABASE_URL"),
          supabaseServiceRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        },
        users: {
          total: users?.length || 0,
          linked: linkedUsers.length,
          linkedUsers: linkedUsers.map(u => ({
            id: u.id,
            name: u.name,
            lineUserId: u.line_user_id,
            notificationEnabled: u.line_notification_enabled
          }))
        },
        errors: {
          usersError: usersError?.message || null
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test config error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
