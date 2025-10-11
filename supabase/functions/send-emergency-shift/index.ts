import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmergencyShiftRequest {
  targetType: "all" | "specific" | "nearby"; // 全員/特定のユーザー/近隣の薬剤師
  targetUserIds?: string[]; // specificの場合の対象ユーザーID
  date: string; // シフト日付
  timeSlot: string; // 時間帯
  startTime?: string; // 開始時刻
  endTime?: string; // 終了時刻
  storeName?: string; // 店舗名
  pharmacyName?: string; // 薬局名
  hourlyRate?: number; // 時給
  memo?: string; // メモ
  nearbyStationName?: string; // 最寄り駅（nearbyの場合）
  maxTravelMinutes?: number; // 最大移動時間（nearbyの場合）
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
    console.log("Emergency shift request:", request);

    // 対象ユーザーを取得
    let targetUsers: any[] = [];

    if (request.targetType === "all") {
      // 全ての薬剤師（LINE連携済みのみ）
      const { data, error } = await supabaseClient
        .from("user_profiles")
        .select("id, name, email, line_user_id, line_notification_enabled")
        .eq("user_type", "pharmacist")
        .not("line_user_id", "is", null)
        .not("line_user_id", "eq", "");

      if (error) throw error;
      targetUsers = data || [];
      
      console.log(`Found ${targetUsers.length} pharmacists with LINE integration`);
    } else if (request.targetType === "specific" && request.targetUserIds) {
      // 特定のユーザー
      const { data, error } = await supabaseClient
        .from("user_profiles")
        .select("id, name, email, line_user_id, line_notification_enabled")
        .in("id", request.targetUserIds)
        .eq("user_type", "pharmacist")
        .eq("line_notification_enabled", true)
        .not("line_user_id", "is", null);

      if (error) throw error;
      targetUsers = data || [];
    } else if (request.targetType === "nearby" && request.nearbyStationName) {
      // 近隣の薬剤師（最寄り駅から一定時間内）
      // まず全薬剤師を取得
      const { data: allPharmacists, error: pharmacistsError } =
        await supabaseClient
          .from("user_profiles")
          .select(
            "id, name, email, line_user_id, line_notification_enabled, nearest_station"
          )
          .eq("user_type", "pharmacist")
          .eq("line_notification_enabled", true)
          .not("line_user_id", "is", null)
          .not("nearest_station", "is", null);

      if (pharmacistsError) throw pharmacistsError;

      // 駅間の移動時間を取得して絞り込み
      const maxMinutes = request.maxTravelMinutes || 30;
      const nearbyUsers: any[] = [];

      for (const pharmacist of allPharmacists || []) {
        // 駅間の移動時間を取得
        const { data: travelTime } = await supabaseClient
          .from("station_travel_times")
          .select("minutes")
          .eq("origin_station_name", pharmacist.nearest_station)
          .eq("dest_station_name", request.nearbyStationName)
          .eq("provider", "google")
          .single();

        if (travelTime && travelTime.minutes <= maxMinutes) {
          nearbyUsers.push(pharmacist);
        }
      }

      targetUsers = nearbyUsers;
    }

    console.log(`Found ${targetUsers.length} target users`);

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
    )}\n時間: ${timeInfo}\n${
      request.storeName ? `店舗: ${request.storeName}\n` : ""
    }${request.pharmacyName ? `薬局: ${request.pharmacyName}\n` : ""}${
      request.hourlyRate ? `時給: ${request.hourlyRate.toLocaleString()}円\n` : ""
    }${request.memo ? `\n${request.memo}\n` : ""}\n詳細・応募はこちら:\n${webAppUrl}\n\nお早めにご確認ください！`;

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

    for (const user of targetUsers) {
      try {
        console.log(`Sending LINE notification to user: ${user.id} (${user.name})`);
        
        const notifyResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              userId: user.id,
              message,
              notificationType: "emergency",
              metadata: {
                shiftDate: request.date,
                timeSlot: request.timeSlot,
                storeName: request.storeName,
              },
            }),
          }
        );
        
        console.log(`LINE notification response for ${user.id}:`, notifyResponse.status, notifyResponse.ok);

        const notifyResult = await notifyResponse.json();
        console.log(`Notification result for user ${user.id} (${user.name}):`, notifyResult);

        if (notifyResult.success) {
          if (notifyResult.skipped) {
            results.skipped++;
            results.details.push({
              userId: user.id,
              name: user.name,
              status: "skipped",
              reason: notifyResult.reason || "Unknown reason",
            });
          } else {
            results.sent++;
            results.details.push({
              userId: user.id,
              name: user.name,
              status: "sent",
            });
          }
        } else {
          results.failed++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: "failed",
            error: notifyResult.error,
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

