import { NextRequest, NextResponse } from "next/server";
import {
  getShippingRates,
  getFallbackRates,
  COLLECTION_ADDRESS,
  getParcelSpecs,
  parseAddress,
  isStangerAddress,
} from "@/lib/courier-guy";

export async function POST(request: NextRequest) {
  try {
    const { address, items } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 }
      );
    }

    // If Stanger address, return the flat R40 rate
    if (isStangerAddress(address)) {
      const settingsFee = await getStangerDeliveryFee();
      return NextResponse.json({
        isStanger: true,
        rates: [
          {
            service_name: "Local Delivery (Stanger)",
            service_code: "STANGER_LOCAL",
            total_price: settingsFee * 100, // convert to cents
            estimated_delivery_days: 1,
            courier_name: "Biltong & Bytes",
            courier_code: "local",
          },
        ],
      });
    }

    // Parse the customer address
    const parsedAddress = parseAddress(address);

    if (!parsedAddress.city) {
      return NextResponse.json(
        { error: "Could not determine city from address. Please include city name." },
        { status: 400 }
      );
    }

    // Get parcel dimensions based on cart items
    const parcels = getParcelSpecs(items || []);

    // Build the rate request for Courier Guy
    const rateRequest = {
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
    };

    try {
      const rates = await getShippingRates(rateRequest);

      if (rates.length === 0) {
        // API returned no rates, use fallback
        console.warn("[Shipping] No rates returned from Courier Guy, using fallback");
        return NextResponse.json({
          isStanger: false,
          rates: getFallbackRates(),
          fallback: true,
        });
      }

      return NextResponse.json({
        isStanger: false,
        rates,
      });
    } catch (apiError) {
      // API failed entirely, return fallback rates
      console.error("[Shipping] Courier Guy API error, using fallback:", apiError);
      return NextResponse.json({
        isStanger: false,
        rates: getFallbackRates(),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("[Shipping] Rates error:", error);
    return NextResponse.json(
      { error: "Failed to get shipping rates" },
      { status: 500 }
    );
  }
}

// Helper: fetch Stanger delivery fee from settings
async function getStangerDeliveryFee(): Promise<number> {
  try {
    const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=delivery_fee`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return data[0].delivery_fee ?? 40;
      }
    }
  } catch {
    // Fall through to default
  }
  return 40;
}
