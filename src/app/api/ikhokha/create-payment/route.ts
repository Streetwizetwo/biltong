import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";

const IKHOKHA_APP_ID = process.env.IKHOKHA_APP_ID || "IK4NR697EBXR1519PNFXVUOWORWHL20P";
const IKHOKHA_APP_SECRET = process.env.IKHOKHA_APP_SECRET || "YtG6KMhiBewvS6o0E6xU1ev7dgkD8qEW";
const IKHOKHA_API_BASE = "https://api.ikhokha.com/public-api/v1/api";

// Generate HMAC-SHA256 signature as per iKhokha docs
function generateSignature(path: string, body: string, secret: string): string {
  const payload = (path + body)
    .replace(/[\\\"']/g, "\\$&")
    .replace(/\u0000/g, "\\0");
  return CryptoJS.HmacSHA256(payload, secret.trim()).toString(CryptoJS.enc.Hex).trim();
}

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId, description } = await request.json();

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: amount, orderId" },
        { status: 400 }
      );
    }

    // Amount in cents (R100.00 = 10000)
    const amountInCents = Math.round(amount * 100);

    // Determine the base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get("host")}`;

    const endpoint = "/api/payment";
    const requestBody = {
      entityID: IKHOKHA_APP_ID,
      externalEntityID: "biltong-and-bytes",
      amount: amountInCents,
      currency: "ZAR",
      requesterUrl: baseUrl,
      mode: "live",
      description: description || `Biltong & Bytes - Order ${orderId}`,
      externalTransactionID: orderId,
      urls: {
        callbackUrl: `${baseUrl}/api/ikhokha/webhook`,
        successPageUrl: `${baseUrl}/?payment=success&order=${orderId}`,
        failurePageUrl: `${baseUrl}/?payment=failed&order=${orderId}`,
        cancelUrl: `${baseUrl}/?payment=cancelled&order=${orderId}`,
      },
    };

    const bodyString = JSON.stringify(requestBody);
    const signature = generateSignature(endpoint, bodyString, IKHOKHA_APP_SECRET);

    console.log(`[iKhokha] Creating payment for ${orderId}, amount: R${amount} (${amountInCents} cents)`);

    const response = await fetch(`${IKHOKHA_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "IK-APPID": IKHOKHA_APP_ID,
        "IK-SIGN": signature,
      },
      body: bodyString,
    });

    const data = await response.json();

    if (!response.ok || data.responseCode !== "00") {
      console.error("[iKhokha] Payment creation failed:", data);
      return NextResponse.json(
        {
          error: "Failed to create payment link",
          details: data.message || data,
          responseCode: data.responseCode,
        },
        { status: 500 }
      );
    }

    console.log(`[iKhokha] Payment link created: ${data.paylinkUrl} (ID: ${data.paylinkID})`);

    return NextResponse.json({
      success: true,
      paylinkUrl: data.paylinkUrl,
      paylinkID: data.paylinkID,
      externalTransactionID: data.externalTransactionID,
    });
  } catch (error) {
    console.error("[iKhokha] Create payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
