import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../admin/auth/route";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

// GET /api/settings — public, no auth needed (storefront reads settings)
export async function GET() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=delivery_fee,product_prices,updated_at`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase settings fetch error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch settings", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      // No settings row yet — return defaults
      return NextResponse.json({
        deliveryFee: 40,
        productPrices: { "0": 35, "1": 100, "2": 300, "3": 550 },
      });
    }

    const row = data[0];
    return NextResponse.json({
      deliveryFee: row.delivery_fee,
      productPrices: row.product_prices,
    });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings — protected by admin password
export async function PUT(request: NextRequest) {
  try {
    // Check auth using shared verifier
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryFee, productPrices } = body;

    if (typeof deliveryFee !== "number" || !productPrices || typeof productPrices !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data. Requires deliveryFee (number) and productPrices (object)" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?id=eq.1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          delivery_fee: deliveryFee,
          product_prices: productPrices,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase settings update error:", errorText);
      return NextResponse.json(
        { error: "Failed to update settings", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
