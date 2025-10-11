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
  console.log("=== send-line-notification Edge Function STARTED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  // 認証ヘッダーの確認
  const authHeader = req.headers.get("authorization");
  console.log("Authorization header exists:", !!authHeader);
  console.log("Authorization header:", authHeader ? authHeader.substring(0, 20) + "..." : "None");
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  // 認証チェック
  console.log("=== AUTH CHECK ===");
  console.log("Auth header received:", authHeader ? "Present" : "Missing");
  console.log("Auth header starts with Bearer:", authHeader?.startsWith("Bearer "));
  
  // 認証チェックを一時的に無効化（Edge Function間の呼び出しのため）
  console.log("Auth check temporarily disabled for Edge Function to Edge Function calls");
  // if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //   console.error("No valid authorization header found");
  //   return new Response(
  //     JSON.stringify({
  //       success: false,
  //       error: "Unauthorized - No valid Bearer token",
  //       authHeader: authHeader || "None"
  //     }),
  //     {
  //       status: 401,
  //       headers: { ...corsHeaders, "Content-Type": "application/json" },
  //     }
  //   );
  // }

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
    console.log("LINE Channel Access Token exists:", !!lineChannelAccessToken);
    console.log("LINE Channel Access Token length:", lineChannelAccessToken?.length || 0);
    
    if (!lineChannelAccessToken) {
      console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    }

    // リクエストボディの解析
    const body: NotificationRequest = await req.json();
    console.log("Notification request:", body);

    let targetLineUserId = body.lineUserId;

    // userIdが指定されている場合、LINE User IDを取得
    if (body.userId && !targetLineUserId) {
      console.log("Fetching user profile for userId:", body.userId);
      
      const { data: userProfile, error: profileError } = await supabaseClient
        .from("user_profiles")
        .select("line_user_id, line_notification_enabled, user_type, name")
        .eq("id", body.userId)
        .single();

      console.log("User profile query result:", { userProfile, profileError });

      if (profileError || !userProfile) {
        console.error("User profile not found:", profileError);
        return new Response(
          JSON.stringify({ error: "User profile not found", details: profileError }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 緊急通知の場合は通知設定を無視
      // 緊急通知は常に送信（ユーザーの設定に関係なく）
      if (body.notificationType === "emergency") {
        console.log("Emergency notification - bypassing user notification settings");
      } else if (!userProfile.line_notification_enabled) {
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
      console.error("No LINE User ID specified");
      throw new Error("No LINE User ID specified");
    }
    
    // LINE User IDの形式を確認
    console.log("=== LINE USER ID VALIDATION ===");
    console.log("LINE User ID:", targetLineUserId);
    console.log("LINE User ID length:", targetLineUserId.length);
    console.log("LINE User ID starts with 'U':", targetLineUserId.startsWith('U'));
    console.log("LINE User ID is valid format:", /^U[a-f0-9]{32}$/.test(targetLineUserId));

    console.log("Sending LINE notification to:", targetLineUserId);
    console.log("Message content:", body.message);
    
    // LINE API呼び出しの詳細ログ
    console.log("=== LINE API CALL DETAILS ===");
    console.log("API Endpoint:", LINE_API_ENDPOINT);
    console.log("Authorization header:", `Bearer ${lineChannelAccessToken?.substring(0, 20)}...`);
    console.log("Target LINE User ID:", targetLineUserId);
    console.log("Message to send:", body.message);
    
    const requestBody = {
      to: targetLineUserId,
      messages: [
        {
          type: "text",
          text: body.message,
        },
      ],
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // LINE Push Messageを送信
    const lineResponse = await fetch(LINE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("LINE API response status:", lineResponse.status);
    console.log("LINE API response ok:", lineResponse.ok);

    const lineResponseData = await lineResponse.text();
    console.log("LINE API response:", {
      status: lineResponse.status,
      body: lineResponseData,
      ok: lineResponse.ok,
    });

    if (!lineResponse.ok) {
      console.error("LINE API error:", {
        status: lineResponse.status,
        statusText: lineResponse.statusText,
        body: lineResponseData,
      });
    }

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

    // LINE APIレスポンスの詳細ログ
    console.log("Final LINE API response check:", {
      ok: lineResponse.ok,
      status: lineResponse.status,
      data: lineResponseData
    });

    if (!lineResponse.ok) {
      console.error("LINE API failed:", lineResponseData);
      throw new Error(`LINE API error: ${lineResponseData}`);
    }

    console.log("LINE notification sent successfully to:", targetLineUserId);

    return new Response(
      JSON.stringify({
        success: true,
        lineUserId: targetLineUserId,
        notificationType: body.notificationType,
        lineApiResponse: lineResponseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== send-line-notification Edge Function ERROR ===");
    console.error("Error sending LINE notification:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
        success: false,
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

