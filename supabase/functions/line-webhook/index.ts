import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-line-signature",
};

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

interface LineWebhookEvent {
  type: string;
  replyToken: string;
  source: {
    type: string;
    userId: string;
  };
  message?: {
    type: string;
    text: string;
  };
}

// LINE Signature検証
function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// LINE Reply Messageを送信
async function replyMessage(
  replyToken: string,
  message: string,
  channelAccessToken: string
) {
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LINE Reply API error:", errorText);
    throw new Error(`LINE Reply API error: ${errorText}`);
  }

  return response;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 環境変数の取得（テスト用にフォールバック値を設定）
    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET") || "YOUR_CHANNEL_SECRET_HERE";
    const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "YOUR_CHANNEL_ACCESS_TOKEN_HERE";

    if (!channelSecret || channelSecret === "YOUR_CHANNEL_SECRET_HERE") {
      console.error("LINE_CHANNEL_SECRET not configured");
      throw new Error("LINE credentials not configured");
    }
    
    if (!channelAccessToken || channelAccessToken === "YOUR_CHANNEL_ACCESS_TOKEN_HERE") {
      console.error("LINE_CHANNEL_ACCESS_TOKEN not configured");
      throw new Error("LINE credentials not configured");
    }

    // リクエストボディの取得
    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature");

    // 署名検証（本番環境では必須）
    if (signature && !verifySignature(bodyText, signature, channelSecret)) {
      console.error("Invalid LINE signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    console.log("LINE webhook received:", body);

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

    // イベント処理
    for (const event of body.events as LineWebhookEvent[]) {
      const { type, replyToken, source } = event;
      const lineUserId = source.userId;

      // メッセージイベントの処理
      if (type === "message" && event.message?.type === "text") {
        const messageText = event.message.text.trim().toUpperCase();

        // 認証コードの形式をチェック（例: ABC123）
        if (/^[A-Z0-9]{6}$/.test(messageText)) {
          // 認証コードの検証
          const { data: authCode, error: authError } = await supabaseClient
            .from("line_auth_codes")
            .select("*, user_profiles!inner(id, name, user_type)")
            .eq("auth_code", messageText)
            .eq("used", false)
            .gt("expires_at", new Date().toISOString())
            .single();

          if (authError || !authCode) {
            // 認証コードが無効
            await replyMessage(
              replyToken,
              "❌ 認証コードが無効です。\n\n有効期限が切れているか、既に使用されている可能性があります。\n\nWebアプリで新しい認証コードを発行してください。",
              channelAccessToken
            );
            continue;
          }

          // 既に他のアカウントと連携済みかチェック
          const { data: existingUser } = await supabaseClient
            .from("user_profiles")
            .select("id, name, user_type")
            .eq("line_user_id", lineUserId)
            .single();

          if (existingUser && existingUser.id !== authCode.user_id) {
            await replyMessage(
              replyToken,
              `⚠️ このLINEアカウントは既に別のユーザー（${existingUser.name}）と連携されています。\n\n連携を解除してから再度お試しください。`,
              channelAccessToken
            );
            continue;
          }

          // LINE連携を保存
          const { error: updateError } = await supabaseClient
            .from("user_profiles")
            .update({
              line_user_id: lineUserId,
              line_linked_at: new Date().toISOString(),
              line_notification_enabled: true,
            })
            .eq("id", authCode.user_id);

          if (updateError) {
            console.error("Error updating user profile:", updateError);
            await replyMessage(
              replyToken,
              "❌ 連携処理中にエラーが発生しました。\n\n時間をおいて再度お試しください。",
              channelAccessToken
            );
            continue;
          }

          // 認証コードを使用済みにする
          await supabaseClient
            .from("line_auth_codes")
            .update({ used: true })
            .eq("id", authCode.id);

          // 成功メッセージ
          const userType =
            authCode.user_profiles.user_type === "pharmacist"
              ? "薬剤師"
              : authCode.user_profiles.user_type === "pharmacy"
              ? "薬局"
              : "管理者";

          await replyMessage(
            replyToken,
            `✅ 連携完了しました！\n\n【登録情報】\n名前: ${authCode.user_profiles.name}\n種別: ${userType}\n\n以下の通知を受け取れます：\n• シフト確定通知\n• 前日リマインド\n• 緊急シフト依頼\n\n通知設定はWebアプリから変更できます。`,
            channelAccessToken
          );
        } else if (messageText === "ヘルプ" || messageText === "HELP") {
          // ヘルプメッセージ
          await replyMessage(
            replyToken,
            `【シフトTYO通知Bot】\n\nこのBotでできること：\n• シフト確定の通知\n• 前日のリマインド\n• 緊急シフト依頼の受信\n\n【使い方】\n1. Webアプリにログイン\n2. 設定画面で認証コードを取得\n3. このBotに認証コードを送信\n\n問題がある場合は管理者にお問い合わせください。`,
            channelAccessToken
          );
        } else {
          // その他のメッセージ
          await replyMessage(
            replyToken,
            `ありがとうございます！\n\nLINE連携するには、Webアプリで発行された6桁の認証コード（例: ABC123）を送信してください。\n\nヘルプが必要な場合は「ヘルプ」と送信してください。`,
            channelAccessToken
          );
        }
      }

      // 友だち追加イベント
      if (type === "follow") {
        await replyMessage(
          replyToken,
          `シフトTYO通知Botへようこそ！\n\n【初めての方】\n1. Webアプリにログイン\n2. 設定画面で認証コードを取得\n3. ここに認証コードを送信\n\nこれでシフト通知を受け取れます！\n\n詳しくは「ヘルプ」と送信してください。`,
          channelAccessToken
        );
      }

      // ブロック解除イベント
      if (type === "unfollow") {
        // ユーザーのLINE連携を無効化
        await supabaseClient
          .from("user_profiles")
          .update({
            line_notification_enabled: false,
          })
          .eq("line_user_id", lineUserId);

        console.log(`User unfollowed: ${lineUserId}`);
      }
    }

    // LINE Webhookは200を返す必要がある
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in LINE webhook:", error);
    // エラーでも200を返す（LINEの仕様）
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

