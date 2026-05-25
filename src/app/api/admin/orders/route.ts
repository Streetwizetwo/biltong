import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "../auth/route";

const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Always exclude soft-deleted orders (order_status = "deleted")
    let query = `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&order_status=neq.deleted`;

    if (status && status !== "all") {
      query += `&order_status=eq.${status}`;
    }

    if (search) {
      query += `&or=(order_id.ilike.*${search}*,customer_name.ilike.*${search}*,customer_phone.ilike.*${search}*)`;
    }

    const response = await fetch(query, {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase fetch error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error("Admin fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, orderStatus, paymentStatus } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};
    if (orderStatus) updateData.order_status = orderStatus;
    if (paymentStatus) updateData.payment_status = paymentStatus;

    console.log(`[Admin] Updating order ${orderId}:`, updateData);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase update error:", errorText);
      return NextResponse.json(
        { error: "Failed to update order", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[Admin] Order ${orderId} updated successfully:`, result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Soft delete: mark order as "deleted" instead of actually removing it
// This avoids RLS issues with DELETE operations on the anon key
export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    console.log(`[Admin] Soft-deleting order ${orderId}`);

    // Soft delete: set order_status to "deleted"
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          order_status: "deleted",
          payment_status: "cancelled",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase soft-delete error:", errorText);
      return NextResponse.json(
        { error: "Failed to delete order", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[Admin] Order ${orderId} soft-deleted:`, result);

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
