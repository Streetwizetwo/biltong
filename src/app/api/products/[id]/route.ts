import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../../admin/auth/route";

// Read Supabase config from env so swapping projects doesn't require code changes.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

/**
 * PATCH /api/products/[id]
 * Admin-only — updates an existing product.
 * Body: any subset of { name, weight, grams, price, description, img, badge, is_active, sort_order }
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
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = await request.json();

    // Build the update row — only allow known fields, ignore unknown ones
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.weight === "string") updates.weight = body.weight.trim();
    if (typeof body.grams === "number") updates.grams = body.grams;
    if (typeof body.price === "number" && body.price >= 0) updates.price = Math.round(body.price);
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.img === "string") updates.img = body.img;
    if (typeof body.badge === "string") updates.badge = body.badge.trim() || null;
    if (body.badge === null) updates.badge = null;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${id}`,
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
      console.error("[Products] Supabase PATCH failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to update product", details: errText },
        { status: 502 }
      );
    }

    const updated: unknown[] = await res.json();
    if (updated.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: updated[0] });
  } catch (err) {
    console.error("[Products] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Admin-only — permanently deletes a product.
 * (Soft-delete alternative: PATCH { is_active: false } — use that if you want
 *  to keep the product in history for old orders. Hard delete is fine for new
 *  products that have never been ordered.)
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
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${id}`,
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
      console.error("[Products] Supabase DELETE failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to delete product", details: errText },
        { status: 502 }
      );
    }

    const deleted: unknown[] = await res.json();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Products] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
