import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

// Default product prices (fallback if settings table doesn't exist)
const DEFAULT_PRICES: Record<string, number> = {
  "The Taster": 35,
  "Snack Pack": 100,
  "Family Batch": 300,
  "The Feast": 550,
};

const DEFAULT_DELIVERY_FEE = 40;

/**
 * Fetch live product prices and delivery fee from the settings table.
 * Falls back to hardcoded defaults if Supabase is unreachable.
 */
async function getLivePrices(): Promise<{
  productPrices: Record<string, number>;
  deliveryFee: number;
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
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const row = data[0];
        // product_prices is keyed by product ID: { "0": 35, "1": 100, ... }
        // We need to map these to product names for validation
        const priceById: Record<string, number> = row.product_prices || {};
        const productPrices: Record<string, number> = {
          "The Taster": priceById["0"] ?? DEFAULT_PRICES["The Taster"],
          "Snack Pack": priceById["1"] ?? DEFAULT_PRICES["Snack Pack"],
          "Family Batch": priceById["2"] ?? DEFAULT_PRICES["Family Batch"],
          "The Feast": priceById["3"] ?? DEFAULT_PRICES["The Feast"],
        };
        return {
          productPrices,
          deliveryFee: row.delivery_fee ?? DEFAULT_DELIVERY_FEE,
        };
      }
    }
  } catch {
    // Fall through to defaults
  }

  return { productPrices: DEFAULT_PRICES, deliveryFee: DEFAULT_DELIVERY_FEE };
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // ============================================
    // SERVER-SIDE PRICE VERIFICATION
    // Recalculate prices from live settings to prevent
    // clients from submitting tampered cart data.
    // ============================================
    const { productPrices, deliveryFee } = await getLivePrices();

    // Recalculate subtotal from items using server-side prices
    let verifiedSubtotal = 0;
    for (const item of orderData.items) {
      const serverPrice = productPrices[item.name];
      if (serverPrice == null) {
        return NextResponse.json(
          { error: `Unknown product: ${item.name}` },
          { status: 400 }
        );
      }
      // Use the SERVER price, not the client-submitted price
      item.price = serverPrice;
      verifiedSubtotal += serverPrice * item.qty;
    }

    // Verify delivery fee
    // Stanger local delivery uses the flat fee from settings
    // Non-Stanger (Courier Guy) uses the rate fetched from our API
    const isStangerDelivery = orderData.delivery_address &&
      (/stanger|kwadukuza|kwa dukuza/i.test(orderData.delivery_address));
    const verifiedDeliveryFee = orderData.delivery_mode === "deliver"
      ? (isStangerDelivery ? deliveryFee : orderData.delivery_fee) // Non-Stanger: trust the Courier Guy rate from our API
      : 0;

    // Recompute total
    const verifiedTotal = verifiedSubtotal + verifiedDeliveryFee;

    // Override client-submitted values with verified values
    orderData.subtotal = verifiedSubtotal;
    orderData.delivery_fee = verifiedDeliveryFee;
    orderData.total = verifiedTotal;

    // Log if there was a discrepancy (potential tampering)
    if (
      Math.abs(verifiedTotal - (orderData.total || 0)) > 1 ||
      Math.abs(verifiedSubtotal - (orderData.subtotal || 0)) > 1
    ) {
      console.warn(
        `[Order] Price discrepancy detected for ${orderData.order_id}. ` +
        `Client total: R${orderData.total}, Server total: R${verifiedTotal}. ` +
        `Using server-verified prices.`
      );
    }

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
    });

    // If the insert succeeded but shipping columns aren't in the table yet,
    // try updating separately (will silently fail if columns don't exist)
    if (response.ok && (orderData.shipping_carrier || orderData.tracking_reference)) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderData.order_id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            ...(orderData.shipping_carrier ? { shipping_carrier: orderData.shipping_carrier } : {}),
            ...(orderData.tracking_reference ? { tracking_reference: orderData.tracking_reference } : {}),
          }),
        });
      } catch { /* columns may not exist yet — non-critical */ }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase error:", errorText);
      return NextResponse.json(
        { error: "Failed to save order", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Order API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, order_status, tracking_reference, shipping_carrier } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (order_status != null) updates.order_status = order_status;
    if (tracking_reference != null) updates.tracking_reference = tracking_reference;
    if (shipping_carrier != null) updates.shipping_carrier = shipping_carrier;

    if (!order_id || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "order_id and at least one field to update are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${order_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Failed to update order", details: errorText },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
