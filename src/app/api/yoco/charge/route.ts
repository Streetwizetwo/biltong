import { NextRequest, NextResponse } from "next/server";

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { token, amount, orderId, customerName, customerEmail } = await request.json();

    if (!token || !amount || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: token, amount, orderId" },
        { status: 400 }
      );
    }

    // Amount in cents (R100.00 = 10000)
    const amountInCents = Math.round(amount * 100);

    console.log(`[Yoco] Creating charge for ${orderId}, amount: R${amount} (${amountInCents} cents)`);

    const response = await fetch("https://api.yoco.com/v1/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": YOCO_SECRET_KEY,
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: "ZAR",
        metadata: {
          orderId,
          customerName: customerName || "",
          customerEmail: customerEmail || "",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Yoco] Charge failed:", data);
      return NextResponse.json(
        {
          error: "Payment failed",
          details: data.errorMessage || data.displayMessage || data,
        },
        { status: 400 }
      );
    }

    console.log(`[Yoco] Charge successful for ${orderId}:`, data.id);

    return NextResponse.json({
      success: true,
      chargeId: data.id,
      status: data.status,
    });
  } catch (error) {
    console.error("[Yoco] Charge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
