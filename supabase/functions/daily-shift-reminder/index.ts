import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// 時刻をフォーマット (HH:MM:SS -> HH:MM)
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

    // 翌日の日付を取得（JST基準）
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Fetching shifts for tomorrow: ${tomorrowStr}`);

    // 翌日のシフトを取得
    const { data: shifts, error: shiftsError } = await supabaseClient
      .from("assigned_shifts")
      .select(
        `
        *,
        pharmacist:pharmacist_id(id, name, email, line_user_id, line_notification_enabled),
        pharmacy:pharmacy_id(id, name, email, line_user_id, line_notification_enabled, address)
      `
      )
      .eq("date", tomorrowStr)
      .eq("status", "confirmed");

    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
      throw shiftsError;
    }

    console.log(`Found ${shifts?.length || 0} shifts for tomorrow`);

    if (!shifts || shifts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No shifts found for tomorrow",
          count: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = {
      total: shifts.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    // 各シフトについて通知を送信
    for (const shift of shifts) {
      // 薬剤師への通知
      if (shift.pharmacist && shift.pharmacist.line_user_id) {
        try {
          const timeInfo =
            shift.start_time && shift.end_time
              ? `${formatTime(shift.start_time)}〜${formatTime(shift.end_time)}`
              : formatTimeSlot(shift.time_slot);

          const message = `【明日のシフトのお知らせ】\n\n日時: ${formatDate(
            shift.date
          )}\n時間: ${timeInfo}\n店舗: ${
            shift.store_name || shift.pharmacy?.name || "未設定"
          }\n${shift.pharmacy?.address ? `住所: ${shift.pharmacy.address}\n` : ""}${
            shift.memo ? `\nメモ: ${shift.memo}` : ""
          }\n\n忘れずにご出勤ください！`;

          const notifyResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                userId: shift.pharmacist.id,
                message,
                notificationType: "reminder",
                metadata: {
                  shiftDate: shift.date,
                  timeSlot: shift.time_slot,
                  storeName: shift.store_name,
                },
              }),
            }
          );

          const notifyResult = await notifyResponse.json();

          if (notifyResult.success) {
            if (notifyResult.skipped) {
              results.skipped++;
              results.details.push({
                type: "pharmacist",
                name: shift.pharmacist.name,
                status: "skipped",
                reason: notifyResult.reason,
              });
            } else {
              results.sent++;
              results.details.push({
                type: "pharmacist",
                name: shift.pharmacist.name,
                status: "sent",
              });
            }
          } else {
            results.failed++;
            results.details.push({
              type: "pharmacist",
              name: shift.pharmacist.name,
              status: "failed",
              error: notifyResult.error,
            });
          }
        } catch (error) {
          console.error(
            `Error sending notification to pharmacist ${shift.pharmacist.id}:`,
            error
          );
          results.failed++;
          results.details.push({
            type: "pharmacist",
            name: shift.pharmacist.name,
            status: "failed",
            error: error.message,
          });
        }
      }

      // 薬局への通知
      if (shift.pharmacy && shift.pharmacy.line_user_id) {
        try {
          const timeInfo =
            shift.start_time && shift.end_time
              ? `${formatTime(shift.start_time)}〜${formatTime(shift.end_time)}`
              : formatTimeSlot(shift.time_slot);

          const message = `【明日のシフトのお知らせ】\n\n日時: ${formatDate(
            shift.date
          )}\n時間: ${timeInfo}\n${
            shift.store_name ? `店舗: ${shift.store_name}\n` : ""
          }薬剤師: ${shift.pharmacist?.name || "未設定"}さん${
            shift.memo ? `\n\nメモ: ${shift.memo}` : ""
          }\n\nご準備をお願いします！`;

          const notifyResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                userId: shift.pharmacy.id,
                message,
                notificationType: "reminder",
                metadata: {
                  shiftDate: shift.date,
                  timeSlot: shift.time_slot,
                  pharmacistName: shift.pharmacist?.name,
                },
              }),
            }
          );

          const notifyResult = await notifyResponse.json();

          if (notifyResult.success) {
            if (notifyResult.skipped) {
              results.skipped++;
              results.details.push({
                type: "pharmacy",
                name: shift.pharmacy.name,
                status: "skipped",
                reason: notifyResult.reason,
              });
            } else {
              results.sent++;
              results.details.push({
                type: "pharmacy",
                name: shift.pharmacy.name,
                status: "sent",
              });
            }
          } else {
            results.failed++;
            results.details.push({
              type: "pharmacy",
              name: shift.pharmacy.name,
              status: "failed",
              error: notifyResult.error,
            });
          }
        } catch (error) {
          console.error(
            `Error sending notification to pharmacy ${shift.pharmacy.id}:`,
            error
          );
          results.failed++;
          results.details.push({
            type: "pharmacy",
            name: shift.pharmacy.name,
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    console.log("Reminder job completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        date: tomorrowStr,
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily reminder job:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send reminders",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

