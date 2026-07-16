import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../admin/auth/route";

// Read Supabase config from env so swapping projects doesn't require code changes.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Fields the storefront needs — keep in sync with the Deal type in src/lib/supabase.ts
export interface DealItem {
  product_id: number;
  product_name: string;
  quantity: number;
  weight: string;
  img: string;
}

export interface DealRow {
  id: number;
  name: string;
  description: string;
  items: DealItem[];
  price: number;
  original_price: number;
  savings: number;
  img: string;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * GET /api/deals
 * Public — returns all active deals ordered by sort_order.
 * Used by the storefront to render the deals section.
 *
 * Query params:
 *   ?include_inactive=1  →  also return hidden deals (admin panel uses this)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "1";

    const filter = includeInactive ? "" : "is_active=eq.true&";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/deals?${filter}order=sort_order.asc,id.asc&select=id,name,description,items,price,original_price,savings,img,badge,is_active,sort_order`,
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
      const errText = await res.text().catch(() => "<no body>");
      // If the deals table doesn't exist yet (migration not run), Supabase
      // returns a 404 or PostgreSQL error. Return an empty array so the
      // storefront falls back to hardcoded DEALS and the admin panel shows
      // "No deals yet" instead of an error toast.
      if (res.status === 404 || errText.includes("does not exist") || errText.includes("42P01")) {
        console.warn("[Deals] Table does not exist yet — returning empty array. Run supabase/migration-deals-table.sql");
        return NextResponse.json({ deals: [] });
      }
      console.error("[Deals] Supabase fetch failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch deals", details: errText },
        { status: 502 }
      );
    }

    const rows: DealRow[] = await res.json();
    return NextResponse.json({ deals: rows });
  } catch (err) {
    console.error("[Deals] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deals
 * Admin-only — creates a new deal.
 * Body: { name, description?, items, price, original_price?, savings?, img?, badge?, is_active?, sort_order? }
 *
 * `items` is an array of { product_id, product_name, quantity, weight, img }.
 * `original_price` and `savings` are optional — if not provided, they are
 * computed from the items (sum of product prices × quantity) using live
 * product prices from the products table. However, the admin can override
 * them to reflect promotional savings.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
    }

    // Validate each item
    for (const item of body.items) {
      if (typeof item.product_name !== "string" || !item.product_name.trim()) {
        return NextResponse.json({ error: "Each item needs a product_name" }, { status: 400 });
      }
      if (typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json({ error: "Each item needs quantity >= 1" }, { status: 400 });
      }
    }

    // Compute original_price + savings if not provided
    let originalPrice = typeof body.original_price === "number" ? body.original_price : 0;
    let savings = typeof body.savings === "number" ? body.savings : 0;

    if (originalPrice === 0) {
      // Try to compute from live product prices
      try {
        const productsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/products?select=id,name,price`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (productsRes.ok) {
          const products: { id: number; name: string; price: number }[] = await productsRes.json();
          const priceById = new Map(products.map((p) => [p.id, p.price]));
          const priceByName = new Map(products.map((p) => [p.name, p.price]));
          originalPrice = body.items.reduce((sum: number, item: DealItem) => {
            const unit = priceById.get(item.product_id) ?? priceByName.get(item.product_name) ?? 0;
            return sum + unit * item.quantity;
          }, 0);
          savings = Math.max(0, originalPrice - body.price);
        }
      } catch {
        // Products fetch failed — leave original_price at 0 (admin can set it manually)
      }
    }

    // Normalize items — ensure all fields are present
    const normalizedItems: DealItem[] = body.items.map((item: DealItem) => ({
      product_id: typeof item.product_id === "number" ? item.product_id : 0,
      product_name: String(item.product_name).trim(),
      quantity: Math.max(1, Math.floor(item.quantity)),
      weight: typeof item.weight === "string" ? item.weight : "",
      img: typeof item.img === "string" ? item.img : "",
    }));

    const insertRow = {
      name: body.name.trim(),
      description: typeof body.description === "string" ? body.description : "",
      items: normalizedItems,
      price: Math.round(body.price),
      original_price: Math.round(originalPrice),
      savings: Math.round(savings),
      img: typeof body.img === "string" ? body.img : "",
      badge: typeof body.badge === "string" && body.badge.trim() ? body.badge.trim() : null,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 999,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertRow),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      console.error("[Deals] Supabase insert failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to create deal", details: errText },
        { status: 502 }
      );
    }

    const created: DealRow[] = await res.json();
    return NextResponse.json({ success: true, deal: created[0] });
  } catch (err) {
    console.error("[Deals] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
