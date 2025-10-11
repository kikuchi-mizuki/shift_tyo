import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmergencyShiftRequest {
  date: string; // シフト日付
  timeSlot: string; // 時間帯
  startTime?: string; // 開始時刻
  endTime?: string; // 終了時刻
}

// 時間帯の日本語表記
function formatTimeSlot(timeSlot: string): string {
  switch (timeSlot) {
    case "morning":
      return "午前";
    case "afternoon":
      return "午後";
    case "fullday":
      return "終日";
    case "negotiable":
      return "要相談";
    default:
      return timeSlot;
  }
}

// 日付を日本語形式にフォーマット
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日(${weekday})`;
}

// 時刻をフォーマット
function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.substring(0, 5);
}

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

    // リクエストボディの解析
    const request: EmergencyShiftRequest = await req.json();
    console.log("Emergency shift request received:", JSON.stringify(request, null, 2));
    
    // リクエストの検証
    if (!request.date) {
      throw new Error("date is required");
    }
    console.log("Request validation passed");

    // 全ての薬剤師を対象とする（LINE連携済みのみ）
    const { data, error } = await supabaseClient
      .from("user_profiles")
      .select("id, name, email, line_user_id, line_notification_enabled")
      .eq("user_type", "pharmacist")
      .eq("line_notification_enabled", true)
      .not("line_user_id", "is", null)
      .not("line_user_id", "eq", "");

    if (error) throw error;
    const targetUsers = data || [];
    
    console.log(`Found ${targetUsers.length} pharmacists with LINE integration`);

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible users found",
          sent: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // メッセージを作成
    const timeInfo =
      request.startTime && request.endTime
        ? `${formatTime(request.startTime)}〜${formatTime(request.endTime)}`
        : formatTimeSlot(request.timeSlot);

    const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://shift-tyo.com";

    const message = `【🚨 緊急シフト募集】\n\n日時: ${formatDate(
      request.date
    )}\n時間: ${timeInfo}\n\n詳細・応募はこちら:\n${webAppUrl}\n\nお早めにご確認ください！`;

    console.log(`Target users found: ${targetUsers.length}`);
    console.log('Target users:', targetUsers.map(u => ({ id: u.id, name: u.name, line_user_id: u.line_user_id })));
    
    // デバッグ: targetUsersの詳細確認
    console.log('=== TARGET USERS DEBUG ===');
    console.log('targetUsers type:', typeof targetUsers);
    console.log('targetUsers is array:', Array.isArray(targetUsers));
    console.log('targetUsers length:', targetUsers?.length);
    console.log('targetUsers content:', JSON.stringify(targetUsers, null, 2));

    // 各ユーザーに通知を送信
    const results = {
      total: targetUsers.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    console.log('=== STARTING NOTIFICATION LOOP ===');
    console.log('About to iterate over targetUsers:', targetUsers);
    
    for (const user of targetUsers) {
      console.log(`=== PROCESSING USER: ${user.id} (${user.name}) ===`);
      try {
        console.log(`Sending LINE notification to user: ${user.id} (${user.name})`);
        console.log(`Using ANON_KEY for Edge Function call: ${Deno.env.get("SUPABASE_ANON_KEY") ? "Present" : "Missing"}`);
        
        console.log(`=== CALLING send-line-notification Edge Function ===`);
        console.log(`URL: ${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`);
        console.log(`Using ANON_KEY: ${Deno.env.get("SUPABASE_ANON_KEY") ? "Present" : "Missing"}`);
        console.log(`ANON_KEY length: ${Deno.env.get("SUPABASE_ANON_KEY")?.length || 0}`);
        console.log(`Request body:`, JSON.stringify({
          userId: user.id,
          message,
          notificationType: "emergency",
          metadata: {
            shiftDate: request.date,
            timeSlot: request.timeSlot,
          },
        }, null, 2));
        
        // 直接LINE APIを呼び出す方法を試行
        console.log("=== DIRECT LINE API CALL ===");
        
        // ユーザープロフィールを取得
        const { data: userProfile, error: profileError } = await supabaseClient
          .from("user_profiles")
          .select("line_user_id, line_notification_enabled, name")
          .eq("id", user.id)
          .single();

        if (profileError || !userProfile) {
          console.error("User profile not found:", profileError);
          results.failed++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: "failed",
            error: "User profile not found",
          });
          continue;
        }

        if (!userProfile.line_user_id || userProfile.line_user_id.trim() === '') {
          console.log("LINE not linked for user:", user.id);
          results.skipped++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: "skipped",
            reason: "LINE not linked",
          });
          continue;
        }

        // LINE APIを直接呼び出し
        const lineChannelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
        console.log("LINE Channel Access Token exists:", !!lineChannelAccessToken);
        
        if (!lineChannelAccessToken) {
          console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
          results.failed++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: "failed",
            error: "LINE Channel Access Token not set",
          });
          continue;
        }

        try {
          const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineChannelAccessToken}`,
            },
            body: JSON.stringify({
              to: userProfile.line_user_id,
              messages: [
                {
                  type: 'text',
                  text: message,
                },
              ],
            }),
          });

          console.log("LINE API response status:", lineResponse.status);
          console.log("LINE API response ok:", lineResponse.ok);
          
          const lineResponseData = await lineResponse.text();
          console.log("LINE API response body:", lineResponseData);

          if (lineResponse.ok) {
            results.sent++;
            results.details.push({
              userId: user.id,
              name: user.name,
              status: "sent",
            });
          } else {
            results.failed++;
            results.details.push({
              userId: user.id,
              name: user.name,
              status: "failed",
              error: `LINE API error: ${lineResponseData}`,
            });
          }
        } catch (error) {
          console.error("LINE API call failed:", error);
          results.failed++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } catch (error) {
        console.error(`Error sending notification to user ${user.id}:`, error);
        results.failed++;
        results.details.push({
          userId: user.id,
          name: user.name,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("Emergency shift notification completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.sent,
        skipped: results.skipped,
        failed: results.failed,
        total: results.total,
        details: results.details,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending emergency shift notification:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send emergency notification",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

