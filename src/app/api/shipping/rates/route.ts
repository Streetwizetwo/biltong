import { NextRequest, NextResponse } from "next/server";
import {
  getShippingRates,
  isStangerAddress,
  parseSAAddress,
} from "@/lib/courier-guy";
import type { ShippingRate, StructuredAddress } from "@/lib/store";

// Stanger flat delivery fee
const STANGER_DELIVERY_FEE = 40; // R40

export async function POST(request: NextRequest) {
  try {
    const { address, items, structuredAddress } = await request.json();

    if (!address || typeof address !== "string" || address.trim().length < 3) {
      return NextResponse.json(
        { isStanger: false, rates: [], error: "Please enter a delivery address" },
        { status: 200 } // Soft error — don't cause console 400s
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      // If no items provided, still return a Stanger flat rate or default estimate
      if (isStangerAddress(address)) {
        const stangerRate: ShippingRate = {
          service_name: "Local Delivery (Stanger)",
          service_code: "STANGER_LOCAL",
          total_price: STANGER_DELIVERY_FEE * 100,
          estimated_delivery_days: 1,
          courier_name: "Biltong & Bytes",
          courier_code: "local",
        };
        return NextResponse.json({ isStanger: true, rates: [stangerRate] });
      }
      return NextResponse.json({
        isStanger: false,
        rates: [],
        error: "Add items to your cart first, then enter your address for shipping rates.",
      });
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
    // Use structured address from Google Maps if available, otherwise parse free text
    let deliveryAddress: {
      street_address: string;
      local_area: string;
      city: string;
      zone: string;
      code: string;
    };

    if (structuredAddress && structuredAddress.city) {
      // Use Google Maps structured data directly — much more reliable
      deliveryAddress = {
        street_address: structuredAddress.street_address || "",
        local_area: structuredAddress.local_area || structuredAddress.city,
        city: structuredAddress.city,
        zone: structuredAddress.zone || "KwaZulu-Natal",
        code: structuredAddress.code || "",
      };
    } else {
      // Fallback: parse the free-text address
      deliveryAddress = parseSAAddress(address);
    }

    // Validate we have enough address info
    if (!deliveryAddress.city || deliveryAddress.city === "Unknown") {
      return NextResponse.json(
        {
          isStanger: false,
          rates: [],
          error: "Please provide a more detailed address including city and province. Try using the address suggestions.",
        },
        { status: 200 }
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

    const courierRates = await getShippingRates(deliveryAddress, items);

    if (!courierRates || courierRates.length === 0) {
      // If we have a structured address with a city, try with just the city
      // Sometimes the street address is too specific and the API can't find it
      if (deliveryAddress.street_address && deliveryAddress.local_area) {
        const simplifiedAddress = {
          ...deliveryAddress,
          street_address: deliveryAddress.local_area,
          local_area: deliveryAddress.city,
        };
        const retryRates = await getShippingRates(simplifiedAddress, items);
        if (retryRates && retryRates.length > 0) {
          const rates: ShippingRate[] = retryRates.map((rate) => ({
            service_name: rate.service_level.description,
            service_code: rate.service_level.code,
            total_price: Math.round(rate.rate * 100),
            estimated_delivery_days:
              rate.service_level.code === "ONX" ? 1 :
              rate.service_level.code === "ECO" ? 3 : 2,
            courier_name: "The Courier Guy",
            courier_code: "tcg",
          }));
          return NextResponse.json({ isStanger: false, rates });
        }
      }

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
