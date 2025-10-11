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
    console.log("=== EDGE FUNCTION AUTH TEST STARTED ===");
    
    // 環境変数の確認
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("SUPABASE_URL:", supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!serviceRoleKey);
    console.log("SUPABASE_SERVICE_ROLE_KEY length:", serviceRoleKey?.length || 0);
    console.log("SUPABASE_ANON_KEY exists:", !!anonKey);
    console.log("SUPABASE_ANON_KEY length:", anonKey?.length || 0);
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Required environment variables are missing");
    }

    // send-line-notification Edge Functionを呼び出しテスト
    const testRequest = {
      userId: "test-user-id",
      message: "Edge Function Auth Test",
      notificationType: "emergency",
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    console.log("=== TESTING Edge Function Call ===");
    console.log("Target URL:", `${supabaseUrl}/functions/v1/send-line-notification`);
    console.log("Using SERVICE_ROLE_KEY:", serviceRoleKey.substring(0, 20) + "...");
    console.log("Request body:", JSON.stringify(testRequest, null, 2));

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-line-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(testRequest),
      }
    );

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log("Response body:", responseText);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log("Parsed response:", parsedResponse);
    } catch (e) {
      console.log("Response is not JSON:", responseText);
    }

    console.log("=== EDGE FUNCTION AUTH TEST COMPLETED ===");

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        response: parsedResponse || responseText,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== EDGE FUNCTION AUTH TEST ERROR ===");
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
