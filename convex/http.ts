import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occurred -- no svix headers", { status: 400 });
    }

    const payload = await request.text();
    
    // 從 Convex 環境變數中讀取 Clerk Webhook Signing Secret (請在 Convex 控制台設定 CLERK_WEBHOOK_SECRET)
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // 1. 準備待簽章內容
    const signedContent = `${svix_id}.${svix_timestamp}.${payload}`;

    // 2. 準備 Signing Secret：移除 "whsec_" 前綴，並對剩餘部分進行 Base64 解碼得到 Key bytes
    const secretKeyStr = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    let keyData: Uint8Array;
    try {
      const binarySecret = atob(secretKeyStr);
      keyData = new Uint8Array(binarySecret.length);
      for (let i = 0; i < binarySecret.length; i++) {
        keyData[i] = binarySecret.charCodeAt(i);
      }
    } catch (e) {
      console.error("Failed to decode CLERK_WEBHOOK_SECRET as base64:", e);
      return new Response("Invalid webhook secret format", { status: 500 });
    }

    const encoder = new TextEncoder();
    const dataToVerify = encoder.encode(signedContent);

    // 3. 匯入 HMAC SHA-256 密鑰進行驗證
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // 4. 提取 svix-signature 中以 "v1," 開頭的簽章值 (相容於多個簽章以空格分隔的情況)
    const signatures = svix_signature.split(" ");
    let signatureValue: string | null = null;
    for (const sig of signatures) {
      const parts = sig.split(",");
      if (parts[0] === "v1" && parts[1]) {
        signatureValue = parts[1];
        break;
      }
    }

    if (!signatureValue) {
      return new Response("Invalid signature format or missing v1 signature", { status: 400 });
    }

    // 將 base64 簽章值轉換為位元組陣列
    let signatureBytes: Uint8Array;
    try {
      const binarySignature = atob(signatureValue);
      signatureBytes = new Uint8Array(binarySignature.length);
      for (let i = 0; i < binarySignature.length; i++) {
        signatureBytes[i] = binarySignature.charCodeAt(i);
      }
    } catch (e) {
      return new Response("Invalid base64 signature", { status: 400 });
    }

    // 執行驗證
    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes,
      dataToVerify
    );

    if (!isValid) {
      console.warn("Invalid signature verification attempt");
      return new Response("Invalid signature", { status: 401 });
    }

    // 驗證成功，處理 Clerk 事件
    const evt = JSON.parse(payload);
    console.log("Clerk Webhook received event type:", evt.type);

    try {
      switch (evt.type) {
        case "user.created":
        case "user.updated": {
          const { id, email_addresses, first_name, last_name } = evt.data;
          const email = email_addresses[0]?.email_address;
          const name = [first_name, last_name].filter(Boolean).join(" ") || "使用者";

          if (email) {
            await ctx.runMutation(api.users.upsertUserFromClerk, {
              ClerkId: id,
              Gmail: email,
              Name: name,
            });
            console.log(`Successfully synced user ${email} from Clerk event ${evt.type}`);
          }
          break;
        }
        case "user.deleted": {
          const { id } = evt.data;
          if (id) {
            await ctx.runMutation(api.users.deleteUserFromClerk, {
              ClerkId: id,
            });
            console.log(`Successfully deleted user with ClerkId ${id} from Clerk event user.deleted`);
          }
          break;
        }
        default:
          console.log("Ignored unhandled Clerk event type:", evt.type);
      }
    } catch (err) {
      console.error("Error processing Clerk webhook event:", err);
      return new Response("Error processing event", { status: 500 });
    }

    return new Response("Success", { status: 200 });
  }),
});

export default http;
