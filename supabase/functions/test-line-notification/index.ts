import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== LINE通知テスト開始 ===");

    // 環境変数の確認
    const lineChannelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("環境変数チェック:", {
      hasLineToken: !!lineChannelAccessToken,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      lineTokenLength: lineChannelAccessToken?.length || 0,
    });

    if (!lineChannelAccessToken) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    }

    // Supabaseクライアント作成
    const supabaseClient = createClient(
      supabaseUrl ?? "",
      supabaseServiceKey ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 薬剤師のLINE連携状況を確認
    const { data: pharmacists, error: pharmacistError } = await supabaseClient
      .from("user_profiles")
      .select("id, name, line_user_id, line_notification_enabled")
      .eq("user_type", "pharmacist")
      .not("line_user_id", "is", null)
      .not("line_user_id", "eq", "");

    console.log("薬剤師データ取得結果:", {
      error: pharmacistError,
      count: pharmacists?.length || 0,
      pharmacists: pharmacists?.map(p => ({
        id: p.id,
        name: p.name,
        hasLineId: !!p.line_user_id,
        lineIdLength: p.line_user_id?.length || 0,
        notificationEnabled: p.line_notification_enabled,
      })),
    });

    if (pharmacistError) {
      throw new Error(`薬剤師データ取得エラー: ${pharmacistError.message}`);
    }

    if (!pharmacists || pharmacists.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "LINE連携済み薬剤師が見つかりません",
          debug: {
            pharmacistsFound: 0,
            environmentCheck: {
              hasLineToken: !!lineChannelAccessToken,
              hasSupabaseUrl: !!supabaseUrl,
              hasSupabaseKey: !!supabaseServiceKey,
            }
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 最初の薬剤師にテストメッセージを送信
    const testUser = pharmacists[0];
    const testMessage = "【テスト通知】LINE通知のテストメッセージです。";

    console.log("テスト送信開始:", {
      targetUser: testUser.id,
      targetName: testUser.name,
      lineUserId: testUser.line_user_id,
    });

    // LINE APIに送信
    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: testUser.line_user_id,
        messages: [
          {
            type: "text",
            text: testMessage,
          },
        ],
      }),
    });

    const lineResponseData = await lineResponse.text();
    console.log("LINE APIレスポンス:", {
      status: lineResponse.status,
      ok: lineResponse.ok,
      body: lineResponseData,
    });

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: lineResponse.ok,
        message: lineResponse.ok ? "テスト通知を送信しました" : "テスト通知に失敗しました",
        debug: {
          targetUser: {
            id: testUser.id,
            name: testUser.name,
            lineUserId: testUser.line_user_id,
          },
          lineResponse: {
            status: lineResponse.status,
            ok: lineResponse.ok,
            body: lineResponseData,
          },
          environmentCheck: {
            hasLineToken: !!lineChannelAccessToken,
            tokenLength: lineChannelAccessToken?.length || 0,
          }
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("LINE通知テストエラー:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
