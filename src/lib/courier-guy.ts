// ============================================
// Courier Guy (Shiplogic) API Integration
// ============================================
// API Docs: https://www.shiplogic.com/tcg/api-docs
// Sandbox: https://sandbox.shiplogic.com
// Production: https://api.shiplogic.com

const COURIER_GUY_API_KEY = process.env.COURIER_GUY_API_KEY || "";
const COURIER_GUY_ACCOUNT = process.env.COURIER_GUY_ACCOUNT || "";

// Use sandbox in development, production in live
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const BASE_URL = IS_PRODUCTION
  ? "https://api.shiplogic.com"
  : "https://sandbox.shiplogic.com";

// ============================================
// TYPES
// ============================================

export interface ShippingRateRequest {
  collection_address: {
    type: "business" | "residential";
    company?: string;
    street_address: string;
    suburb: string;
    city: string;
    province: string;
    postal_code: string;
    country: string; // "ZA"
  };
  delivery_address: {
    type: "business" | "residential";
    company?: string;
    street_address: string;
    suburb: string;
    city: string;
    province: string;
    postal_code: string;
    country: string; // "ZA"
  };
  parcels: Array<{
    parcel_length: number; // cm
    parcel_width: number;  // cm
    parcel_height: number; // cm
    parcel_weight: number; // kg
  }>;
}

export interface ShippingRate {
  service_name: string;
  service_code: string;
  total_price: number;     // in cents
  estimated_delivery_days: number;
  courier_name: string;
  courier_code: string;
}

export interface ShippingRateResponse {
  rates: ShippingRate[];
}

export interface CreateShipmentRequest {
  collection_address: ShippingRateRequest["collection_address"];
  delivery_address: ShippingRateRequest["delivery_address"];
  parcels: ShippingRateRequest["parcels"];
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  service_code: string;
  reference: string; // order ID
}

export interface CreateShipmentResponse {
  shipment_id: string;
  tracking_number: string;
  label_url?: string;
}

export interface TrackingEvent {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

// ============================================
// COLLECTION ADDRESS (your Stanger address)
// ============================================

export const COLLECTION_ADDRESS: ShippingRateRequest["collection_address"] = {
  type: "business",
  company: "Biltong & Bytes",
  street_address: "King Street",
  suburb: "Stanger",
  city: "Stanger",
  province: "KwaZulu-Natal",
  postal_code: "4450",
  country: "ZA",
};

// ============================================
// PRODUCT PARCEL DIMENSIONS
// ============================================
// Approximate parcel sizes for each product
// Biltong is relatively light but bulky in packaging

export function getParcelSpecs(items: Array<{ name: string; qty: number }>) {
  // Calculate total weight and estimate dimensions
  // Product weights: Taster 50g, Snack Pack 150g, Family Batch 500g, Feast 1kg
  let totalWeightKg = 0;
  let totalItems = 0;

  for (const item of items) {
    totalItems += item.qty;
    if (item.name.includes("Taster")) totalWeightKg += 0.05 * item.qty;
    else if (item.name.includes("Snack")) totalWeightKg += 0.15 * item.qty;
    else if (item.name.includes("Family")) totalWeightKg += 0.5 * item.qty;
    else if (item.name.includes("Feast")) totalWeightKg += 1.0 * item.qty;
    else totalWeightKg += 0.3 * item.qty; // fallback
  }

  // Determine parcel size based on total items and weight
  // Use a single parcel for most orders, split for very large orders
  if (totalWeightKg <= 2 && totalItems <= 5) {
    // Small parcel (flyer bag)
    return [{
      parcel_length: 30,
      parcel_width: 20,
      parcel_height: 5,
      parcel_weight: Math.max(totalWeightKg, 0.2),
    }];
  } else if (totalWeightKg <= 5) {
    // Medium parcel
    return [{
      parcel_length: 40,
      parcel_width: 30,
      parcel_height: 15,
      parcel_weight: totalWeightKg,
    }];
  } else if (totalWeightKg <= 10) {
    // Large parcel
    return [{
      parcel_length: 50,
      parcel_width: 40,
      parcel_height: 20,
      parcel_weight: totalWeightKg,
    }];
  } else {
    // Split into multiple medium parcels
    const parcels = [];
    let remaining = totalWeightKg;
    let remainingItems = totalItems;
    while (remaining > 0) {
      const parcelWeight = Math.min(remaining, 5);
      remaining -= parcelWeight;
      remainingItems -= Math.min(remainingItems, 5);
      parcels.push({
        parcel_length: 40,
        parcel_width: 30,
        parcel_height: 15,
        parcel_weight: Math.max(parcelWeight, 0.2),
      });
    }
    return parcels;
  }
}

// ============================================
// SA PROVINCE LOOKUP
// ============================================

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

// Common SA cities mapped to provinces
const CITY_PROVINCE_MAP: Record<string, string> = {
  "johannesburg": "Gauteng",
  "joburg": "Gauteng",
  "sandton": "Gauteng",
  "pretoria": "Gauteng",
  "centurion": "Gauteng",
  "midrand": "Gauteng",
  "randburg": "Gauteng",
  "roodepoort": "Gauteng",
  "benoni": "Gauteng",
  "boksburg": "Gauteng",
  "germiston": "Gauteng",
  "springs": "Gauteng",
  "vereeniging": "Gauteng",
  "vanderbijlpark": "Gauteng",
  "krugersdorp": "Gauteng",
  "soweto": "Gauteng",
  "durban": "KwaZulu-Natal",
  "pietermaritzburg": "KwaZulu-Natal",
  "ballito": "KwaZulu-Natal",
  "umhlanga": "KwaZulu-Natal",
  "pinetown": "KwaZulu-Natal",
  "chatsworth": "KwaZulu-Natal",
  "richards bay": "KwaZulu-Natal",
  "richardsbay": "KwaZulu-Natal",
  "stanger": "KwaZulu-Natal",
  "kwaDukuza": "KwaZulu-Natal",
  "newcastle": "KwaZulu-Natal",
  "ladysmith": "KwaZulu-Natal",
  "cape town": "Western Cape",
  "capetown": "Western Cape",
  "stellenbosch": "Western Cape",
  "paarl": "Western Cape",
  "somerset west": "Western Cape",
  "bellville": "Western Cape",
  "kuilsriver": "Western Cape",
  "mitchells plain": "Western Cape",
  "port elizabeth": "Eastern Cape",
  "gqeberha": "Eastern Cape",
  "east london": "Eastern Cape",
  "bloemfontein": "Free State",
  "kimberley": "Northern Cape",
  "polokwane": "Limpopo",
  "nelspruit": "Mpumalanga",
  "mbombela": "Mpumalanga",
  "rustenburg": "North West",
  "mahikeng": "North West",
  "potchefstroom": "North West",
  "klerksdorp": "North West",
};

export function lookupProvince(city: string): string {
  const normalized = city.toLowerCase().trim();
  return CITY_PROVINCE_MAP[normalized] || "KwaZulu-Natal"; // default to KZN
}

// ============================================
// CHECK IF ADDRESS IS IN STANGER
// ============================================

export function isStangerAddress(address: string): boolean {
  const normalized = address.toLowerCase().trim();
  return (
    normalized.includes("stanger") ||
    normalized.includes("kwadukuza") ||
    normalized.includes("kwa dukuza")
  );
}

// ============================================
// API CALLS
// ============================================

async function courierGuyFetch(path: string, options: RequestInit = {}) {
  if (!COURIER_GUY_API_KEY) {
    throw new Error("COURIER_GUY_API_KEY not configured");
  }

  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${COURIER_GUY_API_KEY}`,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Courier Guy] API error ${response.status}:`, errorText);
    throw new Error(`Courier Guy API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get shipping rates from The Courier Guy
 */
export async function getShippingRates(
  request: ShippingRateRequest
): Promise<ShippingRate[]> {
  try {
    const data = await courierGuyFetch("/rates", {
      method: "POST",
      body: JSON.stringify(request),
    });

    // The API returns rates in various formats depending on the version
    // Normalize to our ShippingRate[] format
    if (Array.isArray(data)) {
      return data.map(normalizeRate);
    }
    if (data.rates && Array.isArray(data.rates)) {
      return data.rates.map(normalizeRate);
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(normalizeRate);
    }

    console.warn("[Courier Guy] Unexpected rates response format:", JSON.stringify(data));
    return [];
  } catch (error) {
    console.error("[Courier Guy] getShippingRates error:", error);
    throw error;
  }
}

/**
 * Create a shipment with The Courier Guy
 */
export async function createShipment(
  request: CreateShipmentRequest
): Promise<CreateShipmentResponse> {
  try {
    const data = await courierGuyFetch("/shipments", {
      method: "POST",
      body: JSON.stringify(request),
    });

    return {
      shipment_id: data.shipment_id || data.id || data.data?.shipment_id || "",
      tracking_number: data.tracking_number || data.waybill_number || data.data?.tracking_number || "",
      label_url: data.label_url || data.waybill_url || data.data?.label_url,
    };
  } catch (error) {
    console.error("[Courier Guy] createShipment error:", error);
    throw error;
  }
}

/**
 * Track a shipment
 */
export async function trackShipment(
  trackingNumber: string
): Promise<TrackingEvent[]> {
  try {
    const data = await courierGuyFetch(`/shipments/track?tracking_number=${encodeURIComponent(trackingNumber)}`);

    if (Array.isArray(data)) return data;
    if (data.events && Array.isArray(data.events)) return data.events;
    if (data.data && Array.isArray(data.data)) return data.data;

    return [];
  } catch (error) {
    console.error("[Courier Guy] trackShipment error:", error);
    throw error;
  }
}

// ============================================
// NORMALIZE RATE RESPONSE
// ============================================

function normalizeRate(rate: Record<string, unknown>): ShippingRate {
  return {
    service_name: (rate.service_name as string) || (rate.service_type_name as string) || "Standard Delivery",
    service_code: (rate.service_code as string) || (rate.service_type_code as string) || "STD",
    total_price: typeof rate.total_price === "number"
      ? rate.total_price
      : typeof rate.price === "number"
        ? rate.price
        : typeof rate.price_in_cents === "number"
          ? rate.price_in_cents
          : Math.round((typeof rate.price_incl === "number" ? rate.price_incl : 0) * 100),
    estimated_delivery_days: typeof rate.estimated_delivery_days === "number"
      ? rate.estimated_delivery_days
      : typeof rate.delivery_days === "number"
        ? rate.delivery_days
        : 2,
    courier_name: (rate.courier_name as string) || "The Courier Guy",
    courier_code: (rate.courier_code as string) || "tcg",
  };
}

// ============================================
// PARSE CUSTOMER ADDRESS
// ============================================

export function parseAddress(address: string): {
  street_address: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
} {
  // Try to parse "Street, Suburb, City" or similar formats
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);

  let street_address = "";
  let suburb = "";
  let city = "";
  let province = "";
  let postal_code = "";

  if (parts.length >= 3) {
    street_address = parts[0];
    suburb = parts[1];
    city = parts[2];
  } else if (parts.length === 2) {
    street_address = parts[0];
    city = parts[1];
  } else {
    street_address = address;
    city = "";
  }

  province = lookupProvince(city);
  postal_code = ""; // Customer would need to provide or we use a default

  return { street_address, suburb, city, province, postal_code };
}

// ============================================
// FALLBACK RATES
// ============================================
// If the API is down, use these reasonable fallback rates

export function getFallbackRates(): ShippingRate[] {
  return [
    {
      service_name: "Economy Delivery",
      service_code: "ECO",
      total_price: 9900, // R99.00 in cents
      estimated_delivery_days: 3,
      courier_name: "The Courier Guy",
      courier_code: "tcg",
    },
    {
      service_name: "Overnight Delivery",
      service_code: "OVN",
      total_price: 14900, // R149.00 in cents
      estimated_delivery_days: 1,
      courier_name: "The Courier Guy",
      courier_code: "tcg",
    },
  ];
}
