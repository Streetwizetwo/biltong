import { NextRequest, NextResponse } from "next/server";

// Google Places Autocomplete proxy
// Keeps the API key server-side and restricts to SA addresses only

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // No API key configured — return empty so frontend falls back to static suggestions
    return NextResponse.json({
      predictions: [],
      fallback: true,
    });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(query)}` +
      `&key=${apiKey}` +
      `&components=country:za` +
      `&types=address` +
      `&language=en`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[Places] API status:", data.status, data.error_message || "");
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const predictions = (data.predictions || []).map(
      (p: { place_id: string; description: string; structured_formatting?: { main_text: string; secondary_text: string } }) => ({
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || "",
      })
    );

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("[Places] Autocomplete error:", error);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
