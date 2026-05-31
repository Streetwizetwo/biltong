import { NextRequest, NextResponse } from "next/server";

// Here Maps Lookup proxy — fetches full address details for a selected place
// Server-side proxy keeps the API key secure

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  const structuredParam = request.nextUrl.searchParams.get("structured");

  if (!placeId && !structuredParam) {
    return NextResponse.json({ error: "place_id or structured required" }, { status: 200 });
  }

  // If structured address data was passed from the autocomplete selection,
  // just return it directly (autosuggest already has most of the data)
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

  const apiKey = process.env.HERE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HERE_MAPS_API_KEY not configured" }, { status: 200 });
  }

  try {
    // Use Here Maps Lookup API to get full details for a place ID
    const url =
      `https://lookup.search.hereapi.com/v1/lookup` +
      `?id=${encodeURIComponent(placeId!)}` +
      `&apiKey=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Here Maps Details] API error:", res.status);
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 200 });
    }

    const data = await res.json();

    if (!data.address) {
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const addr = data.address;
    const street = addr.street || "";
    const district = addr.district || "";
    const city = addr.city || "";
    const state = addr.state || "KwaZulu-Natal";
    const postalCode = addr.postalCode || "";

    const formatted = addr.label || [street, district, city, state, postalCode].filter(Boolean).join(", ");

    return NextResponse.json({
      formatted_address: formatted,
      structured: {
        street_address: street,
        local_area: district || city,
        city: city || district,
        zone: state,
        code: postalCode,
        formatted,
        lat: data.position?.lat,
        lng: data.position?.lng,
      },
    });
  } catch (error) {
    console.error("[Here Maps Details] Error:", error);
    return NextResponse.json({ error: "Failed to get place details" }, { status: 200 });
  }
}
