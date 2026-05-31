import { NextRequest, NextResponse } from "next/server";

// Google Maps Place Details proxy
// When user selects an address from autocomplete, this fetches the full
// structured address components (street number, route, suburb, city, province, postal code)
// Server-side proxy keeps the API key secure

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 200 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 200 });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=address_component,formatted_address,geometry` +
      `&key=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Google Places Details] API error:", res.status);
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 200 });
    }

    const data = await res.json();

    if (data.status !== "OK") {
      console.warn("[Google Places Details] API status:", data.status);
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const result = data.result;
    const components = result.address_components || [];

    // Helper: extract a component by type
    const getComponent = (type: string, short = false) => {
      const comp = components.find((c: { types: string[] }) => c.types.includes(type));
      return comp ? (short ? comp.short_name : comp.long_name) : "";
    };

    // Build a Courier Guy-compatible structured address
    // Google gives us: street_number, route, sublocality, locality, administrative_area_level_1, postal_code
    // Courier Guy wants: street_address, local_area, city, zone, code

    const streetNumber = getComponent("street_number");
    const route = getComponent("route");
    const sublocality = getComponent("sublocality") || getComponent("sublocality_level_1");
    const locality = getComponent("locality");
    const adminLevel2 = getComponent("administrative_area_level_2"); // e.g. "KwaDukuza"
    const province = getComponent("administrative_area_level_1"); // e.g. "KwaZulu-Natal"
    const postalCode = getComponent("postal_code");

    // street_address: "27 King Street" or just "King Street" if no number
    const street_address = [streetNumber, route].filter(Boolean).join(" ") || route || "";

    // local_area: suburb/neighbourhood
    const local_area = sublocality || adminLevel2 || locality || "";

    // city: main city/town
    const city = locality || adminLevel2 || sublocality || "";

    // zone: province
    const zone = province || "KwaZulu-Natal";

    // code: postal code
    const code = postalCode || "";

    const formatted = result.formatted_address || 
      [street_address, local_area, city, zone, code].filter(Boolean).join(", ");

    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;

    return NextResponse.json({
      formatted_address: formatted,
      structured: {
        street_address,
        local_area,
        city,
        zone,
        code,
        formatted,
        lat: typeof lat === "number" ? lat : undefined,
        lng: typeof lng === "number" ? lng : undefined,
      },
    });
  } catch (error) {
    console.error("[Google Places Details] Error:", error);
    return NextResponse.json({ error: "Failed to get place details" }, { status: 200 });
  }
}
