import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== DIRECT LINE API TEST STARTED ===");
    
    // 環境変数の確認
    const lineChannelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    console.log("LINE_CHANNEL_ACCESS_TOKEN exists:", !!lineChannelAccessToken);
    console.log("LINE_CHANNEL_ACCESS_TOKEN length:", lineChannelAccessToken?.length || 0);
    console.log("LINE_CHANNEL_ACCESS_TOKEN starts with:", lineChannelAccessToken?.substring(0, 10) || "N/A");
    
    if (!lineChannelAccessToken) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    }

    // テスト用のLINE User ID（実際のユーザーのIDを使用）
    const testLineUserId = "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 実際のIDに置き換える必要があります
    
    const testMessage = `LINE API直接テスト - ${new Date().toISOString()}`;
    
    console.log("=== LINE API CALL DETAILS ===");
    console.log("API Endpoint: https://api.line.me/v2/bot/message/push");
    console.log("Authorization header:", `Bearer ${lineChannelAccessToken.substring(0, 20)}...`);
    console.log("Target LINE User ID:", testLineUserId);
    console.log("Test message:", testMessage);
    
    const requestBody = {
      to: testLineUserId,
      messages: [
        {
          type: "text",
          text: testMessage,
        },
      ],
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // LINE APIに直接送信
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("LINE API response status:", lineResponse.status);
    console.log("LINE API response ok:", lineResponse.ok);
    
    const lineResponseData = await lineResponse.text();
    console.log("LINE API response body:", lineResponseData);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(lineResponseData);
      console.log("Parsed response:", parsedResponse);
    } catch (e) {
      console.log("Response is not JSON:", lineResponseData);
    }

    console.log("=== DIRECT LINE API TEST COMPLETED ===");

    return new Response(
      JSON.stringify({
        success: lineResponse.ok,
        status: lineResponse.status,
        response: parsedResponse || lineResponseData,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== DIRECT LINE API TEST ERROR ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
