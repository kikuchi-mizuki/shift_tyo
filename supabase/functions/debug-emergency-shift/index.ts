import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("=== DEBUG EMERGENCY SHIFT FUNCTION STARTED ===");
    
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

    // 1. 環境変数の確認
    console.log("=== ENVIRONMENT VARIABLES CHECK ===");
    console.log("SUPABASE_URL:", Deno.env.get("SUPABASE_URL") ? "Present" : "Missing");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "Present" : "Missing");
    console.log("SUPABASE_ANON_KEY:", Deno.env.get("SUPABASE_ANON_KEY") ? "Present" : "Missing");
    console.log("LINE_CHANNEL_ACCESS_TOKEN:", Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ? "Present" : "Missing");
    
    if (Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")) {
      console.log("LINE_CHANNEL_ACCESS_TOKEN length:", Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")?.length);
    }

    // 2. 薬剤師ユーザーの詳細確認
    console.log("=== PHARMACIST USERS CHECK ===");
    const { data: pharmacists, error: pharmacistError } = await supabaseClient
      .from('user_profiles')
      .select('id, name, email, user_type, line_user_id, line_notification_enabled, nearest_station_name')
      .eq('user_type', 'pharmacist');

    if (pharmacistError) {
      console.error("Error fetching pharmacists:", pharmacistError);
    } else {
      console.log("Total pharmacists found:", pharmacists?.length || 0);
      
      pharmacists?.forEach((pharmacist, index) => {
        console.log(`Pharmacist ${index + 1}:`, {
          id: pharmacist.id,
          name: pharmacist.name,
          line_user_id: pharmacist.line_user_id ? `${pharmacist.line_user_id.substring(0, 10)}...` : 'NULL',
          line_user_id_length: pharmacist.line_user_id?.length || 0,
          line_notification_enabled: pharmacist.line_notification_enabled,
          has_line_id: !!(pharmacist.line_user_id && pharmacist.line_user_id.trim() !== '')
        });
      });
    }

    // 3. LINE連携済み薬剤師の確認
    console.log("=== LINE-LINKED PHARMACISTS CHECK ===");
    const { data: lineLinkedPharmacists, error: lineError } = await supabaseClient
      .from('user_profiles')
      .select('id, name, email, line_user_id, line_notification_enabled')
      .eq('user_type', 'pharmacist')
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (lineError) {
      console.error("Error fetching LINE-linked pharmacists:", lineError);
    } else {
      console.log("LINE-linked pharmacists found:", lineLinkedPharmacists?.length || 0);
      
      lineLinkedPharmacists?.forEach((pharmacist, index) => {
        console.log(`LINE Pharmacist ${index + 1}:`, {
          id: pharmacist.id,
          name: pharmacist.name,
          line_user_id: `${pharmacist.line_user_id.substring(0, 10)}...`,
          line_notification_enabled: pharmacist.line_notification_enabled
        });
      });
    }

    // 4. send-line-notification Edge Functionの直接テスト
    if (lineLinkedPharmacists && lineLinkedPharmacists.length > 0) {
      console.log("=== TESTING send-line-notification Edge Function ===");
      
      const testUser = lineLinkedPharmacists[0];
      const testMessage = `緊急シフト募集デバッグテスト - ${new Date().toISOString()}`;
      
      console.log(`Testing with user: ${testUser.id} (${testUser.name})`);
      
      try {
        const notifyResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              userId: testUser.id,
              message: testMessage,
              notificationType: "emergency",
              metadata: {
                debug: true,
                testTime: new Date().toISOString()
              },
            }),
          }
        );
        
        console.log(`send-line-notification response status: ${notifyResponse.status}`);
        console.log(`send-line-notification response ok: ${notifyResponse.ok}`);
        
        const notifyResult = await notifyResponse.json();
        console.log("send-line-notification result:", JSON.stringify(notifyResult, null, 2));
        
      } catch (error) {
        console.error("Error testing send-line-notification:", error);
      }
    }

    // 5. LINE APIの直接テスト
    if (lineLinkedPharmacists && lineLinkedPharmacists.length > 0 && Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")) {
      console.log("=== TESTING LINE API DIRECTLY ===");
      
      const testUser = lineLinkedPharmacists[0];
      const testMessage = `LINE API直接テスト - ${new Date().toISOString()}`;
      
      try {
        const lineApiResponse = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")}`,
          },
          body: JSON.stringify({
            to: testUser.line_user_id,
            messages: [
              {
                type: 'text',
                text: testMessage,
              },
            ],
          }),
        });
        
        console.log(`LINE API response status: ${lineApiResponse.status}`);
        console.log(`LINE API response ok: ${lineApiResponse.ok}`);
        
        const lineApiResult = await lineApiResponse.text();
        console.log("LINE API result:", lineApiResult);
        
      } catch (error) {
        console.error("Error testing LINE API directly:", error);
      }
    }

    console.log("=== DEBUG EMERGENCY SHIFT FUNCTION COMPLETED ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Debug completed - check logs",
        timestamp: new Date().toISOString(),
        pharmacistCount: pharmacists?.length || 0,
        lineLinkedCount: lineLinkedPharmacists?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Debug function error:", error);
    
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
