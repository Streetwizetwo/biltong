import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";

const IKHOKHA_APP_ID = process.env.IKHOKHA_APP_ID || "IK4NR697EBXR1519PNFXVUOWORWHL20P";
const IKHOKHA_APP_SECRET = process.env.IKHOKHA_APP_SECRET || "YtG6KMhiBewvS6o0E6xU1ev7dgkD8qEW";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

// Verify webhook signature
function verifySignature(path: string, body: string, signature: string, secret: string): boolean {
  const payload = (path + body)
    .replace(/[\\\"']/g, "\\$&")
    .replace(/\u0000/g, "\\0");
  const computed = CryptoJS.HmacSHA256(payload, secret.trim()).toString(CryptoJS.enc.Hex).trim();
  return computed === signature;
}

export async function POST(request: NextRequest) {
  try {
    const ikAppId = request.headers.get("ik-appid");
    const ikSign = request.headers.get("ik-sign");

    // 1. Verify App ID
    if (ikAppId !== IKHOKHA_APP_ID) {
      console.warn("[iKhokha Webhook] Unauthorized app ID:", ikAppId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read body
    const body = await request.text();
    const bodyJson = JSON.parse(body);

    // 3. Verify signature — use the full path as registered in the callback URL
    // iKhokha signs the webhook using the path portion of the callbackUrl we provided
    const callbackPath = "/api/ikhokha/webhook";
    if (!verifySignature(callbackPath, body, ikSign || "", IKHOKHA_APP_SECRET)) {
      console.warn("[iKhokha Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { paylinkID, status, externalTransactionID, responseCode } = bodyJson;

    console.log(
      `[iKhokha Webhook] Payment ${status} for order ${externalTransactionID} (paylink: ${paylinkID})`
    );

    // 4. Update Supabase order status
    if (responseCode === "00" && status === "SUCCESS") {
      // Payment successful
      await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${externalTransactionID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          payment_status: "paid",
          order_status: "confirmed",
          paylink_id: paylinkID,
        }),
      });
      console.log(`[iKhokha Webhook] Order ${externalTransactionID} marked as PAID`);
    } else {
      // Payment failed
      await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${externalTransactionID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          payment_status: "failed",
          order_status: "payment_failed",
          paylink_id: paylinkID,
        }),
      });
      console.log(`[iKhokha Webhook] Order ${externalTransactionID} payment FAILED`);
    }

    // 5. Always respond 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[iKhokha Webhook] Error:", error);
    // Still return 200 so iKhokha doesn't retry
    return NextResponse.json({ received: true });
  }
}
