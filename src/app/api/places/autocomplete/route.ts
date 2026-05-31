import { NextRequest, NextResponse } from "next/server";

// Google Maps Places Autocomplete proxy
// Returns real SA addresses (residential, business, suburbs, cities)
// NOT just Courier Guy pickup points — actual delivery addresses
// Server-side proxy keeps the API key secure (never exposed to client)

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return NextResponse.json({
      predictions: [],
      fallback: true,
      error: "GOOGLE_MAPS_API_KEY not configured",
    });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(query)}` +
      `&components=country:za` + // Restrict to South Africa
      `&types=geocode` + // Addresses only (no businesses/POIs)
      `&key=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[Google Places] API error:", res.status);
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[Google Places] API status:", data.status, data.error_message || "");
      return NextResponse.json({ predictions: [], fallback: true });
    }

    // Map Google Places predictions to our format
    const predictions = (data.predictions || []).map(
      (pred: {
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
        types: string[];
      }) => ({
        place_id: pred.place_id,
        description: pred.description,
        main_text: pred.structured_formatting?.main_text || pred.description,
        secondary_text: pred.structured_formatting?.secondary_text || "",
        types: pred.types || [],
      })
    );

    return NextResponse.json({ predictions, source: "google_maps" });
  } catch (error) {
    console.error("[Google Places] Search error:", error);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
