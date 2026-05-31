import { NextRequest, NextResponse } from "next/server";
import { createShipment, isStangerAddress, parseSAAddress } from "@/lib/courier-guy";
import type { StructuredAddress } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      deliveryAddress,
      structuredAddress,
      customerName,
      customerPhone,
      customerEmail,
      items,
      serviceLevelCode,
      specialInstructions,
    } = await request.json();

    if (!orderId || !deliveryAddress || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If Stanger local delivery, no Courier Guy shipment needed
    if (isStangerAddress(deliveryAddress)) {
      return NextResponse.json({
        success: true,
        local: true,
        message: "Stanger local delivery — no courier shipment created",
      });
    }

    if (!process.env.COURIER_GUY_API_KEY) {
      return NextResponse.json(
        { error: "Courier integration not configured" },
        { status: 500 }
      );
    }

    // Use structured address from Google Maps if available, otherwise parse free text
    const finalAddress = structuredAddress && structuredAddress.city
      ? {
          street_address: structuredAddress.street_address || "",
          local_area: structuredAddress.local_area || structuredAddress.city,
          city: structuredAddress.city,
          zone: structuredAddress.zone || "KwaZulu-Natal",
          code: structuredAddress.code || "",
        }
      : parseSAAddress(deliveryAddress);

    // Map service code to service level ID
    // These are TCG's standard service level IDs
    const serviceLevelMap: Record<string, number> = {
      ECO: 1,  // Economy
      ONX: 2,  // Overnight Express
    };

    const serviceLevelId = serviceLevelMap[serviceLevelCode] || 1; // Default to Economy

    const result = await createShipment({
      deliveryAddress: finalAddress,
      deliveryContact: {
        name: customerName,
        mobile_number: customerPhone.startsWith("+") ? customerPhone : `+27${customerPhone.replace(/^0/, "")}`,
        email: customerEmail || "orders@biltongandbytes.co.za",
      },
      items,
      serviceLevelId,
      customerReference: orderId,
      specialInstructions,
    });

    console.log(`[Shipping] Shipment created for ${orderId}: ${result.short_tracking_reference}`);

    return NextResponse.json({
      success: true,
      local: false,
      shipmentId: result.id,
      trackingReference: result.short_tracking_reference,
    });
  } catch (error) {
    console.error("[Shipping] Create shipment error:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
