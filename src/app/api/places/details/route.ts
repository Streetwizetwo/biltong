import { NextRequest, NextResponse } from "next/server";

// Courier Guy Pickup Points details — returns structured address for a pickup point
// Since the autocomplete already returns structured data, this endpoint
// is simpler — it just returns the stored structured address from the selection

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  const structuredParam = request.nextUrl.searchParams.get("structured");

  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 200 });
  }

  // If structured address data was passed from the autocomplete selection,
  // just return it directly (it already came from Courier Guy)
  if (structuredParam) {
    try {
      const structured = JSON.parse(decodeURIComponent(structuredParam));
      const formatted = `${structured.street_address}, ${structured.local_area}, ${structured.city}, ${structured.zone}, ${structured.code}`;

      return NextResponse.json({
        formatted_address: formatted,
        structured: {
          street_address: structured.street_address || "",
          local_area: structured.local_area || structured.city,
          city: structured.city,
          zone: structured.zone || "KwaZulu-Natal",
          code: structured.code || "",
          formatted,
          lat: structured.lat,
          lng: structured.lng,
        },
      });
    } catch {
      // Fall through to API lookup
    }
  }

  // Fallback: fetch from Courier Guy API
  const apiKey = process.env.COURIER_GUY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 200 });
  }

  try {
    const url = `https://api.portal.thecourierguy.co.za/v2/pickup-points?search=${encodeURIComponent(placeId)}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const data = await res.json();
    const point = data.pickup_points?.[0];

    if (!point?.address) {
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const addr = point.address;
    const formatted = `${addr.street_address}, ${addr.local_area}, ${addr.city}, ${addr.zone}, ${addr.code}`;

    return NextResponse.json({
      formatted_address: formatted,
      structured: {
        street_address: addr.street_address || "",
        local_area: addr.local_area || addr.city,
        city: addr.city,
        zone: addr.zone || "KwaZulu-Natal",
        code: addr.code || "",
        formatted,
        lat: addr.lat,
        lng: addr.lng,
      },
    });
  } catch (error) {
    console.error("[CourierGuy Places] Details error:", error);
    return NextResponse.json({ error: "Failed to get place details" }, { status: 200 });
  }
}
