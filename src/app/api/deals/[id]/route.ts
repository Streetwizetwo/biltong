import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../../admin/auth/route";

// Read Supabase config from env so swapping projects doesn't require code changes.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

import type { DealItem, DealRow } from "../route";
// Note: DealItem and DealRow are re-exported here for convenience; they originate in the deals collection route.

/**
 * PATCH /api/deals/[id]
 * Admin-only — updates an existing deal.
 * Body: any subset of { name, description, items, price, original_price, savings, img, badge, is_active, sort_order }
 *
 * If `items` is updated and `original_price`/`savings` are NOT provided,
 * we recompute them from live product prices.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid deal id" }, { status: 400 });
    }

    const body = await request.json();

    // Build the update row — only allow known fields
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.price === "number" && body.price >= 0) updates.price = Math.round(body.price);
    if (typeof body.original_price === "number") updates.original_price = Math.round(body.original_price);
    if (typeof body.savings === "number") updates.savings = Math.round(body.savings);
    if (typeof body.img === "string") updates.img = body.img;
    if (typeof body.badge === "string") updates.badge = body.badge.trim() || null;
    if (body.badge === null) updates.badge = null;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;

    // Normalize items if provided
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json({ error: "items cannot be empty" }, { status: 400 });
      }
      for (const item of body.items) {
        if (typeof item.product_name !== "string" || !item.product_name.trim()) {
          return NextResponse.json({ error: "Each item needs a product_name" }, { status: 400 });
        }
        if (typeof item.quantity !== "number" || item.quantity < 1) {
          return NextResponse.json({ error: "Each item needs quantity >= 1" }, { status: 400 });
        }
      }
      updates.items = body.items.map((item: DealItem) => ({
        product_id: typeof item.product_id === "number" ? item.product_id : 0,
        product_name: String(item.product_name).trim(),
        quantity: Math.max(1, Math.floor(item.quantity)),
        weight: typeof item.weight === "string" ? item.weight : "",
        img: typeof item.img === "string" ? item.img : "",
      }));

      // If items changed but original_price/savings were NOT explicitly provided,
      // recompute from live product prices.
      const shouldRecompute =
        typeof body.original_price !== "number" && typeof body.savings !== "number";
      if (shouldRecompute) {
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
            const computedOriginal = (updates.items as DealItem[]).reduce((sum, item) => {
              const unit = priceById.get(item.product_id) ?? priceByName.get(item.product_name) ?? 0;
              return sum + unit * item.quantity;
            }, 0);
            updates.original_price = Math.round(computedOriginal);
            const dealPrice = typeof body.price === "number" ? body.price : 0;
            updates.savings = Math.max(0, Math.round(computedOriginal - dealPrice));
          }
        } catch {
          // Products fetch failed — leave original_price/savings unchanged
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/deals?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      console.error("[Deals] Supabase PATCH failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to update deal", details: errText },
        { status: 502 }
      );
    }

    const updated: DealRow[] = await res.json();
    if (updated.length === 0) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, deal: updated[0] });
  } catch (err) {
    console.error("[Deals] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deals/[id]
 * Admin-only — permanently deletes a deal.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid deal id" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/deals?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      console.error("[Deals] Supabase DELETE failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to delete deal", details: errText },
        { status: 502 }
      );
    }

    const deleted: unknown[] = await res.json();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Deals] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
