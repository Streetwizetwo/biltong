import { NextRequest, NextResponse } from "next/server";
import {
  createShipment,
  COLLECTION_ADDRESS,
  getParcelSpecs,
  parseAddress,
} from "@/lib/courier-guy";

export async function POST(request: NextRequest) {
  try {
    const {
      address,
      items,
      contact_name,
      contact_phone,
      contact_email,
      service_code,
      order_id,
    } = await request.json();

    if (!address || !service_code || !order_id) {
      return NextResponse.json(
        { error: "Missing required fields: address, service_code, order_id" },
        { status: 400 }
      );
    }

    // Parse the customer address
    const parsedAddress = parseAddress(address);

    if (!parsedAddress.city) {
      return NextResponse.json(
        { error: "Could not determine city from address" },
        { status: 400 }
      );
    }

    // Get parcel dimensions
    const parcels = getParcelSpecs(items || []);

    // Create the shipment
    const shipmentRequest = {
      collection_address: COLLECTION_ADDRESS,
      delivery_address: {
        type: "residential" as const,
        street_address: parsedAddress.street_address,
        suburb: parsedAddress.suburb || parsedAddress.city,
        city: parsedAddress.city,
        province: parsedAddress.province,
        postal_code: parsedAddress.postal_code || "0000",
        country: "ZA",
      },
      parcels,
      contact_name: contact_name || "Customer",
      contact_phone: contact_phone || "",
      contact_email: contact_email || undefined,
      service_code,
      reference: order_id,
    };

    const shipment = await createShipment(shipmentRequest);

    console.log(`[Shipping] Shipment created for order ${order_id}: tracking=${shipment.tracking_number}`);

    return NextResponse.json({
      success: true,
      shipment_id: shipment.shipment_id,
      tracking_number: shipment.tracking_number,
      label_url: shipment.label_url,
    });
  } catch (error) {
    console.error("[Shipping] Create shipment error:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
