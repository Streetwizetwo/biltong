import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

/**
 * Public endpoint: GET /api/orders/status?order_id=BB260620-XXXX
 * Returns only the payment + order status fields (no PII).
 * Used by the checkout UI to poll for iKhokha webhook confirmation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order_id" },
        { status: 400 }
      );
    }

    // Basic format check to prevent injection — order IDs look like BB260620-XXXX
    if (!/^BB\d{6}-[A-Z0-9]+$/i.test(orderId)) {
      return NextResponse.json(
        { error: "Invalid order_id format" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(
        orderId
      )}&select=order_id,payment_status,order_status,payment_method,total`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch order status" },
        { status: 500 }
      );
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Order not found", found: false },
        { status: 404 }
      );
    }

    const order = data[0];
    // Only expose non-sensitive fields
    return NextResponse.json({
      found: true,
      order_id: order.order_id,
      payment_status: order.payment_status,
      order_status: order.order_status,
      payment_method: order.payment_method,
      total: order.total,
    });
  } catch (error) {
    console.error("[Order Status API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
