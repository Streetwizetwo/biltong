import { NextRequest, NextResponse } from "next/server";

// Read Supabase config from env so swapping projects doesn't require code changes.
// Set SUPABASE_URL + SUPABASE_ANON_KEY in Vercel Project Settings → Environment Variables.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Default product prices (fallback if settings table doesn't exist OR Supabase is unreachable)
const DEFAULT_PRICES: Record<string, number> = {
  "The Taster": 35,
  "Snack Pack": 100,
  "Family Batch": 300,
  "The Feast": 550,
};

// Default deal prices (fallback if deals table doesn't exist yet — the
// storefront shows hardcoded DEALS from src/lib/supabase.ts, so customers
// can still order them. These prices MUST match the DEALS array exactly.)
const DEFAULT_DEAL_PRICES: Record<string, number> = {
  "Triple Taster Saver": 139,
  "Double Snack Pack": 249,
  "Family + Taster Combo": 439,
  "Double Feast": 1250,
};

const DEFAULT_DELIVERY_FEE = 40;
const DEFAULT_NATIONWIDE_FEE = 150;

/**
 * Fetch live product prices (from the products table), deal prices (from the
 * deals table), and delivery fees (from the settings table). Falls back to
 * hardcoded defaults if Supabase is unreachable.
 *
 * Product prices are keyed by product NAME (e.g. "Snack Pack") — the cart
 * stores item.name as "ProductName Weight" (e.g. "Snack Pack 150g"), so the
 * caller matches by name prefix.
 *
 * Deal prices are keyed by deal NAME (exact match). Deal cart items are
 * detected by exact name match against this map — deals can have any flavor
 * the customer picked (Traditional/Chilli/Hot Honey Glazed), so detection
 * is name-based, not flavor-based.
 */
async function getLivePrices(): Promise<{
  productPrices: Record<string, number>;
  dealPrices: Record<string, number>;
  deliveryFee: number;
  nationwideDeliveryFee: number;
  supabaseReachable: boolean;
}> {
  // Run all three fetches in parallel for speed
  const [productsRes, settingsRes, dealsRes] = await Promise.allSettled([
    fetch(
      `${SUPABASE_URL}/rest/v1/products?select=name,price&is_active=eq.true`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=delivery_fee,product_prices`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/deals?is_active=eq.true&select=name,price`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    ),
  ]);

  // Parse products table → productPrices map (keyed by name)
  let productPrices: Record<string, number> = { ...DEFAULT_PRICES };
  let productsReachable = false;
  if (productsRes.status === "fulfilled" && productsRes.value.ok) {
    try {
      const rows: { name: string; price: number }[] = await productsRes.value.json();
      if (rows && rows.length > 0) {
        productPrices = {};
        for (const row of rows) {
          productPrices[row.name] = row.price;
        }
        productsReachable = true;
      }
    } catch {
      // fall through to defaults
    }
  } else if (productsRes.status === "rejected") {
    console.warn("[Orders] Products fetch failed:", productsRes.reason instanceof Error ? productsRes.reason.message : String(productsRes.reason));
  }

  // Parse deals table → dealPrices map (keyed by deal name)
  // Falls back to DEFAULT_DEAL_PRICES if the deals table doesn't exist yet
  // (migration not run) or Supabase is unreachable. This lets customers order
  // the hardcoded starter deals even before the migration is run.
  let dealPrices: Record<string, number> = { ...DEFAULT_DEAL_PRICES };
  if (dealsRes.status === "fulfilled" && dealsRes.value.ok) {
    try {
      const rows: { name: string; price: number }[] = await dealsRes.value.json();
      if (rows && rows.length > 0) {
        // Live deals found — replace the fallback map entirely
        dealPrices = {};
        for (const row of rows) {
          dealPrices[row.name] = row.price;
        }
      }
      // If rows is empty (table exists but no active deals), keep the fallback
      // so the hardcoded storefront deals can still be verified. This is a
      // trade-off: an admin who deletes ALL deals would expect deal ordering
      // to stop, but the storefront would still show hardcoded deals. The
      // admin should hide deals via is_active=false instead of deleting them.
    } catch {
      // keep fallback
    }
  } else if (dealsRes.status === "rejected") {
    console.warn("[Orders] Deals fetch failed:", dealsRes.reason instanceof Error ? dealsRes.reason.message : String(dealsRes.reason));
  }

  // Parse settings table → delivery fees (and legacy product_prices fallback)
  let deliveryFee = DEFAULT_DELIVERY_FEE;
  let nationwideDeliveryFee = DEFAULT_NATIONWIDE_FEE;
  let settingsReachable = false;
  if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
    try {
      const data = await settingsRes.value.json();
      if (data && data.length > 0) {
        const row = data[0];
        deliveryFee = row.delivery_fee ?? DEFAULT_DELIVERY_FEE;
        const priceById: Record<string, number> = row.product_prices || {};
        nationwideDeliveryFee = priceById.nationwide_delivery_fee ?? DEFAULT_NATIONWIDE_FEE;
        settingsReachable = true;

        // If products table was unreachable, fall back to legacy settings.product_prices
        if (!productsReachable) {
          productPrices = {
            "The Taster": priceById["0"] ?? DEFAULT_PRICES["The Taster"],
            "Snack Pack": priceById["1"] ?? DEFAULT_PRICES["Snack Pack"],
            "Family Batch": priceById["2"] ?? DEFAULT_PRICES["Family Batch"],
            "The Feast": priceById["3"] ?? DEFAULT_PRICES["The Feast"],
          };
        }
      }
    } catch {
      // fall through to defaults
    }
  } else if (settingsRes.status === "rejected") {
    console.warn("[Orders] Settings fetch failed:", settingsRes.reason instanceof Error ? settingsRes.reason.message : String(settingsRes.reason));
  }

  const supabaseReachable = productsReachable || settingsReachable;
  if (!supabaseReachable) {
    console.warn("[Orders] Supabase fully unreachable, using hardcoded defaults.");
  }

  return {
    productPrices,
    dealPrices,
    deliveryFee,
    nationwideDeliveryFee,
    supabaseReachable,
  };
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
    const { productPrices, dealPrices, deliveryFee, nationwideDeliveryFee, supabaseReachable } = await getLivePrices();

    // Recalculate subtotal from items using server-side prices.
    // Two kinds of items can be in the cart:
    //   1) DEAL items — detected by EXACT name match against the deals
    //      table (dealPrices map). Deals can have any flavor the customer
    //      picked (Traditional/Chilli/Hot Honey Glazed), so we can no longer
    //      use the legacy `flavor === "Bundle"` flag for detection.
    //   2) PRODUCT items — matched by name (exact, then prefix) against the
    //      products table. Cart stores item.name as "ProductName Weight"
    //      (e.g. "Snack Pack 150g"), so prefix matching handles the weight.
    let verifiedSubtotal = 0;
    const knownProductNames = Object.keys(productPrices);
    for (const item of orderData.items) {
      let serverPrice: number | undefined;

      // Deal detection: exact name match against the deals map.
      // (Deal names like "Triple Taster Saver" are distinct from product
      // names like "The Taster", so there's no collision risk.)
      if (dealPrices[item.name] !== undefined) {
        serverPrice = dealPrices[item.name];
      } else {
        // Product item — try exact match first, then prefix match
        let matchedName: string | undefined = knownProductNames.find(
          (p) => p === item.name
        );
        if (!matchedName) {
          matchedName = knownProductNames.find(
            (p) => item.name === p || item.name.startsWith(p + " ")
          );
        }
        serverPrice = matchedName ? productPrices[matchedName] : undefined;
        if (serverPrice == null) {
          console.error(`[Orders] Unknown product: "${item.name}". Known: ${knownProductNames.join(", ")}`);
          return NextResponse.json(
            { error: `Unknown product: ${item.name}` },
            { status: 400 }
          );
        }
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
