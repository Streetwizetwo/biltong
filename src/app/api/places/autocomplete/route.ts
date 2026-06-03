import { NextRequest, NextResponse } from "next/server";

// Geoapify Autocomplete proxy for SA address search
// Returns real delivery addresses (residential, streets, suburbs, cities)
// Server-side proxy keeps the API key secure (never exposed to client)
// Geoapify free tier: 3,000 requests/day (90,000/month)

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      predictions: [],
      fallback: true,
      error: "GEOAPIFY_API_KEY not configured",
    });
  }

  try {
    // Geoapify autocomplete — restrict to South Africa
    const url =
      `https://api.geoapify.com/v1/geocode/autocomplete` +
      `?text=${encodeURIComponent(query)}` +
      `&apiKey=${apiKey}` +
      `&filter=countrycode:za` +
      `&limit=8` +
      `&type=building,street,suburb,city,postcode`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Geoapify] API error:", res.status);
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const data = await res.json();

    // Map Geoapify features to our prediction format
    const predictions = (data.features || []).map(
      (feature: {
        properties: {
          place_id: string;
          formatted: string;
          address_line1: string;
          address_line2: string;
          housenumber?: string;
          street?: string;
          suburb?: string;
          city?: string;
          county?: string;
          state?: string;
          postcode?: string;
          lat: number;
          lon: number;
          result_type: string;
        };
      }) => {
        const p = feature.properties;

        // Build Courier Guy-compatible structured address
        const street_address = [p.housenumber, p.street].filter(Boolean).join(" ") || p.street || "";
        const local_area = p.suburb || p.county || p.city || "";
        const city = p.city || p.county || p.suburb || "";
        const zone = p.state || "KwaZulu-Natal";
        const code = p.postcode || "";

        return {
          place_id: p.place_id,
          description: p.formatted,
          main_text: p.address_line1 || p.formatted.split(",")[0],
          secondary_text: p.address_line2 || "",
          resultType: p.result_type,
          // Geoapify returns full structured data — no second API call needed
          structured: {
            street_address,
            local_area,
            city,
            zone,
            code,
            lat: p.lat,
            lng: p.lon,
          },
        };
      }
    );

    return NextResponse.json({ predictions, source: "geoapify" });
  } catch (error) {
    console.error("[Geoapify] Search error:", error);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
