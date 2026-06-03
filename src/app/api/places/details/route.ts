import { NextRequest, NextResponse } from "next/server";

// Geoapify Place Details proxy — fetches full address for a selected place
// Server-side proxy keeps the API key secure
// Usually not needed since autocomplete returns structured data already

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  const structuredParam = request.nextUrl.searchParams.get("structured");

  if (!placeId && !structuredParam) {
    return NextResponse.json({ error: "place_id or structured required" }, { status: 200 });
  }

  // If structured address data was passed from the autocomplete selection,
  // just return it directly (Geoapify autocomplete already has all the data)
  if (structuredParam) {
    try {
      const structured = JSON.parse(decodeURIComponent(structuredParam));
      const formatted = [structured.street_address, structured.local_area, structured.city, structured.zone, structured.code]
        .filter(Boolean).join(", ");

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

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEOAPIFY_API_KEY not configured" }, { status: 200 });
  }

  try {
    // Use Geoapify Place Details API
    const url =
      `https://api.geoapify.com/v2/place-details` +
      `?id=${encodeURIComponent(placeId!)}` +
      `&apiKey=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Geoapify Details] API error:", res.status);
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 200 });
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.properties) {
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const p = feature.properties;
    const street_address = [p.housenumber, p.street].filter(Boolean).join(" ") || p.street || "";
    const local_area = p.suburb || p.county || p.city || "";
    const city = p.city || p.county || p.suburb || "";
    const zone = p.state || "KwaZulu-Natal";
    const code = p.postcode || "";
    const formatted = p.formatted || [street_address, local_area, city, zone, code].filter(Boolean).join(", ");

    return NextResponse.json({
      formatted_address: formatted,
      structured: {
        street_address,
        local_area,
        city,
        zone,
        code,
        formatted,
        lat: p.lat,
        lng: p.lon,
      },
    });
  } catch (error) {
    console.error("[Geoapify Details] Error:", error);
    return NextResponse.json({ error: "Failed to get place details" }, { status: 200 });
  }
}
