import { NextRequest, NextResponse } from "next/server";

// Read Supabase config from env so swapping projects doesn't require code changes.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

/**
 * Public endpoint: GET /api/orders/status?order_id=BB260620-XXXX
 * Returns only the payment + order status fields (no PII).
 * Used by the checkout UI to poll for iKhokha webhook confirmation.
 *
 * DEGRADED MODE: If Supabase is unreachable, returns 200 with
 * { found: true, degraded: true, payment_status: "pending", order_status: "new" }
 * so the polling loop doesn't crash and the customer can still use the
 * manual "I've Paid — Confirm Order" button.
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

    try {
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
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!res.ok) {
        // Supabase responded with an error — degrade gracefully
        console.warn(`[Order Status] Supabase returned ${res.status} for ${orderId}. Degrading.`);
        return NextResponse.json({
          found: true,
          degraded: true,
          order_id: orderId,
          payment_status: "pending",
          order_status: "new",
        });
      }

      const data = await res.json();
      if (!data || data.length === 0) {
        // Order not in Supabase — but we don't want the polling to crash.
        // Return degraded "pending" so the customer can manually confirm.
        return NextResponse.json({
          found: true,
          degraded: true,
          order_id: orderId,
          payment_status: "pending",
          order_status: "new",
        });
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
    } catch (fetchErr) {
      // Network error reaching Supabase — degrade gracefully so polling continues
      console.warn(`[Order Status] Supabase unreachable for ${orderId}:`, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      return NextResponse.json({
        found: true,
        degraded: true,
        order_id: orderId,
        payment_status: "pending",
        order_status: "new",
      });
    }
  } catch (error) {
    console.error("[Order Status API] Handler error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
