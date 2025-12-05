import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmergencyShiftRequest {
  shiftId: string; // シフトID
  targetType: "all" | "specific" | "nearby"; // 通知対象タイプ
  targetIds?: string[]; // 特定薬剤師のID（specificの場合）
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
    if (!request.shiftId) {
      throw new Error("shiftId is required");
    }
    if (!request.targetType) {
      throw new Error("targetType is required");
    }
    if (request.targetType === "specific" && (!request.targetIds || request.targetIds.length === 0)) {
      throw new Error("targetIds is required when targetType is 'specific'");
    }
    console.log("Request validation passed");

    // シフト情報を取得
    const { data: shift, error: shiftError } = await supabaseClient
      .from("shift_postings")
      .select("*, user_profiles!pharmacy_id(name, nearest_station_name)")
      .eq("id", request.shiftId)
      .single();

    if (shiftError || !shift) {
      throw new Error(`Shift not found: ${shiftError?.message || 'Unknown error'}`);
    }

    console.log("Shift data loaded:", shift);

    // 通知対象の薬剤師を取得
    let targetUsersQuery = supabaseClient
      .from("user_profiles")
      .select("id, name, email, line_user_id, line_notification_enabled, nearest_station_name")
      .eq("user_type", "pharmacist")
      .eq("line_notification_enabled", true)
      .not("line_user_id", "is", null)
      .not("line_user_id", "eq", "");

    if (request.targetType === "specific") {
      // 特定薬剤師のみ
      targetUsersQuery = targetUsersQuery.in("id", request.targetIds!);
    } else if (request.targetType === "nearby") {
      // 近隣薬剤師（薬局の最寄駅と同じ薬剤師）
      const pharmacyStation = shift.user_profiles?.nearest_station_name;
      if (pharmacyStation) {
        targetUsersQuery = targetUsersQuery.eq("nearest_station_name", pharmacyStation);
      }
    }
    // targetType === "all" の場合は条件追加なし（全員）

    const { data, error } = await targetUsersQuery;

    if (error) throw error;
    const targetUsers = data || [];

    console.log(`Found ${targetUsers.length} pharmacists with LINE integration (targetType: ${request.targetType})`);

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
      shift.start_time && shift.end_time
        ? `${formatTime(shift.start_time)}〜${formatTime(shift.end_time)}`
        : formatTimeSlot(shift.time_slot);

    const pharmacyName = shift.user_profiles?.name || "薬局";
    const storeName = shift.store_name ? ` ${shift.store_name}` : "";

    const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://shift-tyo.com";

    const message = `【🚨 緊急シフト募集】\n\n薬局: ${pharmacyName}${storeName}\n日時: ${formatDate(
      shift.date
    )}\n時間: ${timeInfo}\n人数: ${shift.required_staff}人\n\n詳細・応募はこちら:\n${webAppUrl}\n\nお早めにご確認ください！`;

    console.log(`Target users found: ${targetUsers.length}`);
    console.log('Target users:', targetUsers.map(u => ({ id: u.id, name: u.name, line_user_id: u.line_user_id })));

    // 各ユーザーに通知を送信
    const results = {
      total: targetUsers.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    console.log('=== STARTING NOTIFICATION LOOP ===');

    for (const user of targetUsers) {
      console.log(`=== PROCESSING USER: ${user.id} (${user.name}) ===`);
      try {
        console.log(`Sending LINE notification to user: ${user.id} (${user.name})`);

        // ユーザープロフィールを確認
        if (!user.line_user_id || user.line_user_id.trim() === '') {
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
              to: user.line_user_id,
              messages: [
                {
                  type: 'text',
                  text: message,
                },
              ],
            }),
          });

          console.log("LINE API response status:", lineResponse.status);

          const lineResponseData = await lineResponse.text();
          console.log("LINE API response body:", lineResponseData);

          if (lineResponse.ok) {
            // 通知ログを保存
            await supabaseClient
              .from("line_notification_logs")
              .insert({
                user_id: user.id,
                notification_type: "emergency",
                message: message,
                status: "sent",
                metadata: {
                  shift_id: request.shiftId,
                  shift_date: shift.date,
                  time_slot: shift.time_slot,
                  target_type: request.targetType,
                },
              });

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
