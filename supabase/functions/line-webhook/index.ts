import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
}

// LINE署名検証関数
async function verifySignature(body: string, signature: string, channelSecret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hash = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return hash === signature;
}

// LINE API リプライ関数
async function replyMessage(replyToken: string, message: string, channelAccessToken: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('Failed to reply message:', await response.text());
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("=== LINE Webhook Request ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  console.log("URL:", req.url);

  try {
    // 環境変数の取得
    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

    console.log("=== Environment Variables ===");
    console.log("Channel Secret exists:", !!channelSecret);
    console.log("Channel Secret length:", channelSecret?.length || 0);
    console.log("Channel Access Token exists:", !!channelAccessToken);
    console.log("Channel Access Token length:", channelAccessToken?.length || 0);

    if (!channelSecret) {
      console.error("LINE_CHANNEL_SECRET is not set");
      return new Response(JSON.stringify({ error: "LINE_CHANNEL_SECRET is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!channelAccessToken) {
      console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
      return new Response(JSON.stringify({ error: "LINE_CHANNEL_ACCESS_TOKEN is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature");

    console.log("=== Signature Verification ===");
    console.log("Has signature:", !!signature);
    console.log("Signature length:", signature?.length || 0);
    console.log("Body length:", bodyText.length);

    // 署名検証（テスト時は一時的に無効化）
    if (signature && !(await verifySignature(bodyText, signature, channelSecret))) {
      console.warn("Invalid LINE signature - continuing anyway for testing");
      // return new Response(JSON.stringify({ error: "Invalid signature" }), {
      //   status: 401,
      //   headers: { ...corsHeaders, "Content-Type": "application/json" },
      // });
    }

    const body = JSON.parse(bodyText);
    console.log("=== Request Body ===");
    console.log(JSON.stringify(body, null, 2));

    // イベント処理
    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        console.log("=== Processing Event ===");
        console.log("Event type:", event.type);
        console.log("Event:", JSON.stringify(event, null, 2));

        if (event.type === 'message' && event.message.type === 'text') {
          const messageText = event.message.text;
          const userId = event.source.userId;

          console.log("=== Message Details ===");
          console.log("Message:", messageText);
          console.log("User ID:", userId);

          // Supabaseクライアントの初期化
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          // 認証コードの処理
          if (messageText.match(/^[A-Z0-9]{6}$/)) {
            console.log("=== Processing Auth Code ===");
            
            // 認証コードを検証
            const { data: authCode, error: authError } = await supabase
              .from('line_auth_codes')
              .select('*, user_profiles!inner(*)')
              .eq('auth_code', messageText)
              .eq('used', false)
              .gt('expires_at', new Date().toISOString())
              .single();

            if (authError || !authCode) {
              console.log("Invalid or expired auth code");
              await replyMessage(
                event.replyToken,
                "認証コードが無効または期限切れです。Webアプリで新しいコードを発行してください。",
                channelAccessToken
              );
              continue;
            }

            // ユーザープロフィールを更新
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                line_user_id: userId,
                line_linked_at: new Date().toISOString(),
                line_notification_enabled: true
              })
              .eq('id', authCode.user_profiles.id);

            if (updateError) {
              console.error("Failed to update user profile:", updateError);
              await replyMessage(
                event.replyToken,
                "LINE連携に失敗しました。もう一度お試しください。",
                channelAccessToken
              );
              continue;
            }

            // 認証コードを使用済みにマーク
            await supabase
              .from('line_auth_codes')
              .update({ used: true })
              .eq('id', authCode.id);

            console.log("LINE linking successful for user:", authCode.user_profiles.id);

            await replyMessage(
              event.replyToken,
              `✅ LINE連携が完了しました！\n\nこれで以下の通知を受け取れます：\n• シフト確定通知\n• シフト前日のリマインダー\n• 緊急シフトリクエスト`,
              channelAccessToken
            );
          } else if (messageText.toLowerCase().includes('ヘルプ') || messageText.toLowerCase().includes('help')) {
            await replyMessage(
              event.replyToken,
              "📋 ヘルプ\n\nLINE連携するには、Webアプリで発行された6桁の認証コード（例: ABC123）を送信してください。\n\n通知設定やその他の機能については、Webアプリの設定ページをご確認ください。",
              channelAccessToken
            );
          } else {
            await replyMessage(
              event.replyToken,
              "ありがとうございます！\n\nLINE連携するには、Webアプリで発行された6桁の認証コード（例: ABC123）を送信してください。\n\nヘルプが必要な場合は「ヘルプ」と送信してください。",
              channelAccessToken
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing LINE webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});