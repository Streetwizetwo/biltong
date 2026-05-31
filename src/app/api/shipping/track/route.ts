import { NextRequest, NextResponse } from "next/server";
import { trackByReference } from "@/lib/courier-guy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingRef = searchParams.get("ref");

    if (!trackingRef) {
      return NextResponse.json(
        { error: "Tracking reference is required (?ref=TCG123456)" },
        { status: 400 }
      );
    }

    if (!process.env.COURIER_GUY_API_KEY) {
      return NextResponse.json(
        { error: "Courier integration not configured" },
        { status: 500 }
      );
    }

    const shipment = await trackByReference(trackingRef);

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      trackingReference: shipment.short_tracking_reference,
      status: shipment.status,
      events: shipment.tracking_events,
    });
  } catch (error) {
    console.error("[Shipping] Tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track shipment" },
      { status: 500 }
    );
  }
}
