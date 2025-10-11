import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// LINE Messaging APIのエンドポイント
const LINE_API_ENDPOINT = "https://api.line.me/v2/bot/message/push";

interface NotificationRequest {
  userId?: string; // Supabase user ID
  lineUserId?: string; // LINE user ID（直接指定する場合）
  message: string;
  notificationType: "shift_confirmed" | "reminder" | "emergency";
  metadata?: {
    shiftDate?: string;
    timeSlot?: string;
    storeName?: string;
    pharmacistName?: string;
  };
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

    // LINE Channel Access Tokenの取得
    const lineChannelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (!lineChannelAccessToken) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    }

    // リクエストボディの解析
    const body: NotificationRequest = await req.json();
    console.log("Notification request:", body);

    let targetLineUserId = body.lineUserId;

    // userIdが指定されている場合、LINE User IDを取得
    if (body.userId && !targetLineUserId) {
      const { data: userProfile, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("line_user_id, line_notification_enabled, user_type, name")
        .eq("id", body.userId)
        .single();

      if (profileError || !userProfile) {
        console.error("User profile not found:", profileError);
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 緊急通知の場合は通知設定を無視
      if (body.notificationType !== "emergency" && !userProfile.line_notification_enabled) {
        console.log("Notification disabled for user:", body.userId);
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "Notification disabled by user",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // LINE連携していない場合はスキップ
      if (!userProfile.line_user_id || userProfile.line_user_id.trim() === '') {
        console.log("LINE not linked for user:", body.userId, "line_user_id:", userProfile.line_user_id);
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "LINE not linked",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      targetLineUserId = userProfile.line_user_id;
    }

    if (!targetLineUserId) {
      throw new Error("No LINE User ID specified");
    }

    // LINE Push Messageを送信
    const lineResponse = await fetch(LINE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: targetLineUserId,
        messages: [
          {
            type: "text",
            text: body.message,
          },
        ],
      }),
    });

    const lineResponseData = await lineResponse.text();
    console.log("LINE API response:", {
      status: lineResponse.status,
      body: lineResponseData,
    });

    // 通知履歴を記録
    const logEntry = {
      user_id: body.userId || null,
      line_user_id: targetLineUserId,
      notification_type: body.notificationType,
      message: body.message,
      status: lineResponse.ok ? "success" : "failed",
      error_message: lineResponse.ok ? null : lineResponseData,
    };

    try {
      await supabaseClient.from("line_notification_logs").insert([logEntry]);
    } catch (logError) {
      console.error("Failed to log notification:", logError);
      // ログ記録の失敗は通知送信の成功/失敗に影響しない
    }

    if (!lineResponse.ok) {
      throw new Error(`LINE API error: ${lineResponseData}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lineUserId: targetLineUserId,
        notificationType: body.notificationType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending LINE notification:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

