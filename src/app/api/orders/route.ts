import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

// Default product prices (fallback if settings table doesn't exist OR Supabase is unreachable)
const DEFAULT_PRICES: Record<string, number> = {
  "The Taster": 35,
  "Snack Pack": 100,
  "Family Batch": 300,
  "The Feast": 550,
};

const DEFAULT_DELIVERY_FEE = 40;
const DEFAULT_NATIONWIDE_FEE = 150;

/**
 * Fetch live product prices and delivery fees from the settings table.
 * Falls back to hardcoded defaults if Supabase is unreachable.
 */
async function getLivePrices(): Promise<{
  productPrices: Record<string, number>;
  deliveryFee: number;
  nationwideDeliveryFee: number;
  supabaseReachable: boolean;
}> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=delivery_fee,product_prices`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        // Don't let this hang the whole checkout — 5s budget
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const row = data[0];
        const priceById: Record<string, number> = row.product_prices || {};
        const productPrices: Record<string, number> = {
          "The Taster": priceById["0"] ?? DEFAULT_PRICES["The Taster"],
          "Snack Pack": priceById["1"] ?? DEFAULT_PRICES["Snack Pack"],
          "Family Batch": priceById["2"] ?? DEFAULT_PRICES["Family Batch"],
          "The Feast": priceById["3"] ?? DEFAULT_PRICES["The Feast"],
        };
        const nationwideDeliveryFee = priceById.nationwide_delivery_fee ?? DEFAULT_NATIONWIDE_FEE;
        return {
          productPrices,
          deliveryFee: row.delivery_fee ?? DEFAULT_DELIVERY_FEE,
          nationwideDeliveryFee,
          supabaseReachable: true,
        };
      }
    }
    // res.ok was false — Supabase responded but with an error
    console.warn("[Orders] Supabase settings fetch returned non-OK status:", res.status);
    return {
      productPrices: DEFAULT_PRICES,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      nationwideDeliveryFee: DEFAULT_NATIONWIDE_FEE,
      supabaseReachable: false,
    };
  } catch (err) {
    // Network error — Supabase is unreachable (paused, deleted, DNS issue, etc.)
    console.warn("[Orders] Supabase unreachable, using default prices. Error:", err instanceof Error ? err.message : String(err));
    return {
      productPrices: DEFAULT_PRICES,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      nationwideDeliveryFee: DEFAULT_NATIONWIDE_FEE,
      supabaseReachable: false,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // ============================================
    // SERVER-SIDE PRICE VERIFICATION
    // Recalculate prices from live settings to prevent
    // clients from submitting tampered cart data.
    // Falls back to hardcoded defaults if Supabase is unreachable.
    // ============================================
    const { productPrices, deliveryFee, nationwideDeliveryFee, supabaseReachable } = await getLivePrices();

    // Recalculate subtotal from items using server-side prices.
    // Cart stores item.name as "ProductName Weight" (e.g. "Snack Pack 150g"),
    // so we match by checking if the cart item name STARTS WITH a known product name.
    let verifiedSubtotal = 0;
    const knownProductNames = Object.keys(productPrices);
    for (const item of orderData.items) {
      // Try exact match first, then prefix match (e.g. "Snack Pack 150g" → "Snack Pack")
      let matchedName: string | undefined = knownProductNames.find(
        (p) => p === item.name
      );
      if (!matchedName) {
        matchedName = knownProductNames.find(
          (p) => item.name === p || item.name.startsWith(p + " ")
        );
      }
      const serverPrice = matchedName ? productPrices[matchedName] : undefined;
      if (serverPrice == null) {
        console.error(`[Orders] Unknown product: "${item.name}". Known: ${knownProductNames.join(", ")}`);
        return NextResponse.json(
          { error: `Unknown product: ${item.name}` },
          { status: 400 }
        );
      }
      // Use the SERVER price, not the client-submitted price
      item.price = serverPrice;
      verifiedSubtotal += serverPrice * item.qty;
    }

    // Verify delivery fee based on chosen delivery mode
    let verifiedDeliveryFee = 0;
    if (orderData.delivery_mode === "stanger") {
      verifiedDeliveryFee = deliveryFee;
    } else if (orderData.delivery_mode === "nationwide") {
      verifiedDeliveryFee = nationwideDeliveryFee;
    }
    // "collect" or legacy "deliver" → 0 (or map "deliver" to stanger for old carts)
    if (orderData.delivery_mode === "deliver") {
      verifiedDeliveryFee = deliveryFee; // backwards compat
    }

    // Recompute total
    const verifiedTotal = verifiedSubtotal + verifiedDeliveryFee;

    // Override client-submitted values with verified values
    orderData.subtotal = verifiedSubtotal;
    orderData.delivery_fee = verifiedDeliveryFee;
    orderData.total = verifiedTotal;

    // ============================================
    // SUPABASE WRITE — gracefully degrade if unreachable
    // ============================================
    // If Supabase is down/deleted, we still let the order succeed so the customer
    // can proceed to payment. The merchant gets an email notification (Resend
    // doesn't depend on Supabase). The admin panel won't show the order until
    // Supabase is restored, but at least the customer isn't blocked.
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            order_id: orderData.order_id,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email || null,
            items: orderData.items,
            items_summary: orderData.items_summary,
            subtotal: verifiedSubtotal,
            delivery_fee: verifiedDeliveryFee,
            total: verifiedTotal,
            delivery_mode: orderData.delivery_mode,
            delivery_address: orderData.delivery_address || null,
            payment_method: orderData.payment_method,
            payment_status: orderData.payment_status,
            order_status: orderData.order_status || "new",
          },
        ]),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "<no body>");
        console.error(`[Orders] Supabase insert failed for ${orderData.order_id}. Status: ${response.status}. Body: ${errorText}`);
        // DEGRADE: still return success so the customer can proceed
        return NextResponse.json({
          success: true,
          data: orderData,
          degraded: true,
          warning: "Order saved locally but not synced to admin panel (database unavailable). Merchant will still receive email notification.",
        });
      }

      const data = await response.json();
      return NextResponse.json({ success: true, data, supabaseReachable });
    } catch (fetchErr) {
      // Supabase fetch threw — network/DNS/timeout. Degrade gracefully.
      console.error(`[Orders] Supabase unreachable for ${orderData.order_id}:`, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      return NextResponse.json({
        success: true,
        data: orderData,
        degraded: true,
        warning: "Order saved locally but not synced to admin panel (database unreachable). Merchant will still receive email notification.",
      });
    }
  } catch (error) {
    // Outer catch — only triggers for bugs in the handler itself (e.g. bad JSON parse)
    console.error("[Orders] POST handler error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, order_status, payment_status } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (order_status != null) updates.order_status = order_status;
    if (payment_status != null) updates.payment_status = payment_status;

    if (!order_id || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "order_id and at least one field to update are required" },
        { status: 400 }
      );
    }

    // ============================================
    // SUPABASE UPDATE — gracefully degrade if unreachable
    // ============================================
    // The PATCH is called from three places:
    //   1. handleIkhokha — marks order as payment_initiated (non-critical)
    //   2. handleConfirmPaid — marks order as paid (customer's manual confirmation)
    //   3. iKhokha webhook — marks order as paid (automatic confirmation)
    // In all three cases, if Supabase is unreachable, the customer flow should
    // still succeed. The merchant gets the email regardless.
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(order_id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "<no body>");
        console.error(`[Orders] Supabase PATCH failed for ${order_id}. Status: ${response.status}. Body: ${errorText}`);
        // Degrade — return success so the client UI proceeds
        return NextResponse.json({ success: true, degraded: true });
      }

      return NextResponse.json({ success: true });
    } catch (fetchErr) {
      console.error(`[Orders] Supabase unreachable during PATCH for ${order_id}:`, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      // Degrade — return success so the client UI proceeds
      return NextResponse.json({ success: true, degraded: true });
    }
  } catch (error) {
    console.error("[Orders] PATCH handler error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
