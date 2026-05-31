import { NextRequest, NextResponse } from "next/server";

// Here Maps Autosuggest proxy for SA address autocomplete
// Returns real delivery addresses (residential, streets, suburbs, cities)
// Server-side proxy keeps the API key secure (never exposed to client)
// Here Maps free tier: 250,000 requests/month

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.HERE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      predictions: [],
      fallback: true,
      error: "HERE_MAPS_API_KEY not configured",
    });
  }

  try {
    // Center on South Africa (approximate center: -29.0, 25.0)
    // Limit results to South Africa using in=countryCode:ZAF
    const url =
      `https://autosuggest.search.hereapi.com/v1/autosuggest` +
      `?q=${encodeURIComponent(query)}` +
      `&apiKey=${apiKey}` +
      `&in=countryCode:ZAF` +
      `&at=-29.0,25.0` + // Center on SA for better relevance
      `&limit=8` +
      `&types=address,locality,postalCode`; // Addresses only — no POIs/businesses

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Here Maps] API error:", res.status);
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const data = await res.json();

    // Map Here Maps items to our prediction format
    // Filter out items that don't have useful address data
    const predictions = (data.items || [])
      .filter((item: { address?: { label?: string } }) => item.address?.label)
      .map(
        (item: {
          id: string;
          address: {
            label: string;
            street?: string;
            district?: string;
            city?: string;
            state?: string;
            postalCode?: string;
          };
          position?: { lat: number; lng: number };
          resultType?: string;
        }) => {
          // Build main_text (street address) and secondary_text (area, city, province)
          const street = item.address?.street || "";
          const district = item.address?.district || "";
          const city = item.address?.city || "";
          const state = item.address?.state || "";
          const postalCode = item.address?.postalCode || "";

          // main_text = street if available, otherwise city
          const main_text = street || city || item.address.label.split(",")[0];

          // secondary_text = district, city, state, postal code
          const secondaryParts = [
            district && district !== city ? district : "",
            city,
            state,
            postalCode,
          ].filter(Boolean);
          const secondary_text = secondaryParts.join(", ");

          return {
            place_id: item.id,
            description: item.address.label,
            main_text,
            secondary_text,
            resultType: item.resultType,
            // Include structured address data from autosuggest so we don't
            // always need a second API call for details
            structured: {
              street_address: street || "",
              local_area: district || city || "",
              city: city || district || "",
              zone: state || "KwaZulu-Natal",
              code: postalCode || "",
              lat: item.position?.lat,
              lng: item.position?.lng,
            },
          };
        }
      );

    return NextResponse.json({ predictions, source: "here_maps" });
  } catch (error) {
    console.error("[Here Maps] Search error:", error);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
