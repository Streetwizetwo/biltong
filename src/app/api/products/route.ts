import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../admin/auth/route";

// Read Supabase config from env so swapping projects doesn't require code changes.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Fields the storefront needs — keep this in sync with the Product type in src/lib/supabase.ts
export interface ProductRow {
  id: number;
  name: string;
  weight: string;
  grams: number;
  price: number;
  description: string;
  img: string;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * GET /api/products
 * Public — returns all active products ordered by sort_order.
 * Used by the storefront to render the product grid.
 *
 * Query params:
 *   ?include_inactive=1  →  also return hidden products (admin panel uses this)
 *                          No auth required — RLS allows public SELECT on all rows,
 *                          and `is_active` is not sensitive. Admin auth is enforced
 *                          on the mutating endpoints (POST/PATCH/DELETE).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "1";

    const filter = includeInactive ? "" : "is_active=eq.true&";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?${filter}order=sort_order.asc,id.asc&select=id,name,weight,grams,price,description,img,badge,is_active,sort_order`,
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
      console.error("[Products] Supabase fetch failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch products", details: errText },
        { status: 502 }
      );
    }

    const rows: ProductRow[] = await res.json();
    return NextResponse.json({ products: rows });
  } catch (err) {
    console.error("[Products] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Admin-only — creates a new product.
 * Body: { name, weight, grams, price, description?, img?, badge?, is_active?, sort_order? }
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
    if (!body.weight || typeof body.weight !== "string") {
      return NextResponse.json({ error: "weight is required (e.g. '150g')" }, { status: 400 });
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
    }

    // Build the insert row with sensible defaults
    const insertRow = {
      name: body.name.trim(),
      weight: body.weight.trim(),
      grams: typeof body.grams === "number" ? body.grams : parseInt(body.weight, 10) || 0,
      price: Math.round(body.price),
      description: typeof body.description === "string" ? body.description : "",
      img: typeof body.img === "string" ? body.img : "",
      badge: typeof body.badge === "string" && body.badge.trim() ? body.badge.trim() : null,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 999, // new products go last by default
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
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
      console.error("[Products] Supabase insert failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to create product", details: errText },
        { status: 502 }
      );
    }

    const created: ProductRow[] = await res.json();
    return NextResponse.json({ success: true, product: created[0] });
  } catch (err) {
    console.error("[Products] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
