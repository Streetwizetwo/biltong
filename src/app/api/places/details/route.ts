import { NextRequest, NextResponse } from "next/server";

// Google Places Details proxy
// Fetches structured address components for a selected place

export interface StructuredAddress {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  formatted: string;
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 200 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 200 });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(placeId)}` +
      `&key=${apiKey}` +
      `&fields=address_component,formatted_address` +
      `&language=en`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.result) {
      console.warn("[Places] Details API status:", data.status);
      return NextResponse.json({ error: "Place not found" }, { status: 200 });
    }

    const components = data.result.address_components || [];

    let street_number = "";
    let route = "";
    let sublocality = "";
    let city = "";
    let province = "";
    let postal_code = "";

    for (const comp of components) {
      const types: string[] = comp.types || [];
      if (types.includes("street_number")) street_number = comp.long_name;
      if (types.includes("route")) route = comp.long_name;
      if (types.includes("sublocality") || types.includes("sublocality_level_1")) sublocality = comp.long_name;
      if (types.includes("locality")) city = comp.long_name;
      if (types.includes("administrative_area_level_1")) province = comp.long_name;
      if (types.includes("postal_code")) postal_code = comp.long_name;
    }

    // Fallback: if no sublocality, use city
    if (!sublocality) sublocality = city;

    // SA province normalization for Courier Guy API
    const provinceMap: Record<string, string> = {
      "kwazulu-natal": "KwaZulu-Natal",
      "gauteng": "Gauteng",
      "western cape": "Western Cape",
      "eastern cape": "Eastern Cape",
      "free state": "Free State",
      "mpumalanga": "Mpumalanga",
      "limpopo": "Limpopo",
      "north west": "North West",
      "northern cape": "Northern Cape",
    };

    const normalizedProvince =
      provinceMap[province.toLowerCase()] || province;

    const structured: StructuredAddress = {
      street_address: `${street_number} ${route}`.trim() || data.result.formatted_address?.split(",")[0] || "",
      local_area: sublocality,
      city: city,
      zone: normalizedProvince,
      code: postal_code,
      formatted: data.result.formatted_address,
    };

    return NextResponse.json({
      formatted_address: data.result.formatted_address,
      structured,
    });
  } catch (error) {
    console.error("[Places] Details error:", error);
    return NextResponse.json({ error: "Failed to get place details" }, { status: 200 });
  }
}
