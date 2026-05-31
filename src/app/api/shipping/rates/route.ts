import { NextRequest, NextResponse } from "next/server";
import {
  getShippingRates,
  isStangerAddress,
  parseSAAddress,
} from "@/lib/courier-guy";
import type { ShippingRate } from "@/lib/store";

// Stanger flat delivery fee
const STANGER_DELIVERY_FEE = 40; // R40

export async function POST(request: NextRequest) {
  try {
    const { address, items } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    // Check if address is in Stanger → R40 flat fee
    if (isStangerAddress(address)) {
      const stangerRate: ShippingRate = {
        service_name: "Local Delivery (Stanger)",
        service_code: "STANGER_LOCAL",
        total_price: STANGER_DELIVERY_FEE * 100, // cents
        estimated_delivery_days: 1,
        courier_name: "Biltong & Bytes",
        courier_code: "local",
      };

      return NextResponse.json({
        isStanger: true,
        rates: [stangerRate],
      });
    }

    // Non-Stanger address → call Courier Guy API for live rates
    const parsedAddress = parseSAAddress(address);

    // Validate we have enough address info
    if (!parsedAddress.city || parsedAddress.city === "Unknown") {
      return NextResponse.json(
        {
          isStanger: false,
          rates: [],
          error: "Please provide a more detailed address including city and province",
        },
        { status: 200 } // Soft error — still 200 so UI can show the message
      );
    }

    // Check if API key is configured
    if (!process.env.COURIER_GUY_API_KEY) {
      console.warn("[Shipping] COURIER_GUY_API_KEY not configured");
      return NextResponse.json(
        {
          isStanger: false,
          rates: [],
          error: "Courier integration not configured. Please contact us for delivery.",
        },
        { status: 200 }
      );
    }

    const courierRates = await getShippingRates(parsedAddress, items);

    if (!courierRates || courierRates.length === 0) {
      return NextResponse.json({
        isStanger: false,
        rates: [],
        error: "No shipping rates available for this address. Please check your address or contact us on WhatsApp.",
      });
    }

    // Map Courier Guy rates to our ShippingRate format
    const rates: ShippingRate[] = courierRates.map((rate) => ({
      service_name: rate.service_level.description,
      service_code: rate.service_level.code,
      total_price: Math.round(rate.rate * 100), // Rands to cents
      estimated_delivery_days:
        rate.service_level.code === "ONX" ? 1 : // Overnight = 1 day
        rate.service_level.code === "ECO" ? 3 : // Economy = 3 days
        2, // Default 2 days
      courier_name: "The Courier Guy",
      courier_code: "tcg",
    }));

    return NextResponse.json({
      isStanger: false,
      rates,
    });
  } catch (error) {
    console.error("[Shipping] Rate check error:", error);
    return NextResponse.json(
      {
        isStanger: false,
        rates: [],
        error: "Failed to get shipping rates. Please try again or contact us on WhatsApp.",
      },
      { status: 200 } // Soft error for better UX
    );
  }
}
