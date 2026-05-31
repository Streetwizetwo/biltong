import { NextRequest, NextResponse } from "next/server";

// Courier Guy Pickup Points address search proxy
// Uses the existing COURIER_GUY_API_KEY — no extra API key needed!
// The /pickup-points?search= endpoint returns structured SA addresses
// including street_address, local_area, city, zone, code, lat, lng

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.COURIER_GUY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      predictions: [],
      fallback: true,
      error: "COURIER_GUY_API_KEY not configured",
    });
  }

  try {
    const url = `https://api.portal.thecourierguy.co.za/v2/pickup-points?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn("[CourierGuy Places] API error:", res.status);
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const data = await res.json();
    const pickupPoints = data.pickup_points || [];

    // Map Courier Guy pickup points to our prediction format
    // Each pickup point has a full structured address
    const predictions = pickupPoints.map(
      (point: {
        pickup_point_id: string;
        name: string;
        type: string;
        address: {
          street_address: string;
          local_area: string;
          city: string;
          zone: string;
          code: string;
          lat: number;
          lng: number;
        };
      }) => ({
        place_id: point.pickup_point_id,
        name: point.name,
        type: point.type, // "locker", "counter", or "point"
        description: point.address
          ? `${point.address.street_address}, ${point.address.local_area}, ${point.address.city}, ${point.address.zone}, ${point.address.code}`
          : point.name,
        main_text: point.address?.street_address || point.name,
        secondary_text: point.address
          ? `${point.address.local_area}, ${point.address.city}, ${point.address.zone}`
          : "",
        structured: point.address
          ? {
              street_address: point.address.street_address,
              local_area: point.address.local_area,
              city: point.address.city,
              zone: point.address.zone,
              code: point.address.code,
              lat: point.address.lat,
              lng: point.address.lng,
            }
          : null,
      })
    );

    return NextResponse.json({ predictions, source: "courier_guy" });
  } catch (error) {
    console.error("[CourierGuy Places] Search error:", error);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
