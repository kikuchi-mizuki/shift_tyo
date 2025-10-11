import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("=== SIMPLE TEST FUNCTION STARTED ===");
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    // 認証ヘッダーの確認
    const authHeader = req.headers.get("authorization");
    console.log("Authorization header exists:", !!authHeader);
    console.log("Authorization header:", authHeader ? authHeader.substring(0, 20) + "..." : "None");
    
    // リクエストボディの確認
    const body = await req.json();
    console.log("Request body:", body);

    console.log("=== SIMPLE TEST FUNCTION COMPLETED SUCCESSFULLY ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Simple test function completed successfully",
        timestamp: new Date().toISOString(),
        receivedAuthHeader: !!authHeader,
        receivedBody: body
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== SIMPLE TEST FUNCTION ERROR ===");
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
