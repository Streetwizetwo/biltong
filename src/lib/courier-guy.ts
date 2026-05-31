// The Courier Guy / Shiplogic API integration
// API Docs: https://shiplogic.com/api-docs
// Base URL: https://api.portal.thecourierguy.co.za/v2/

const TCG_BASE_URL = "https://api.portal.thecourierguy.co.za/v2";

// Your business collection address in Stanger, KZN
const COLLECTION_ADDRESS = {
  contact_name: "Biltong & Bytes",
  company: "Biltong & Bytes",
  street_address: "27 King Street",
  local_area: "Stanger",
  city: "KwaDukuza",
  zone: "KwaZulu-Natal",
  country: "ZA",
  code: "4450",
};

const COLLECTION_CONTACT = {
  name: "Biltong & Bytes",
  mobile_number: "+27636402722",
  email: "orders@biltongandbytes.co.za",
};

function getApiKey(): string {
  const key = process.env.COURIER_GUY_API_KEY;
  if (!key) throw new Error("COURIER_GUY_API_KEY not configured");
  return key;
}

async function tcgFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = getApiKey();
  const url = `${TCG_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  return res;
}

// ============================================
// RATE CHECKING
// ============================================

export interface CourierRate {
  service_level: {
    id: number;
    code: string;
    description: string;
  };
  rate: number; // ZAR total including VAT
  rate_excluding_vat: number;
  base_rate: {
    charge: number;
  };
  rate_adjustments: Array<{
    id: number;
    name: string;
    charge: number;
    charge_value: number;
  }>;
}

export interface RatesResponse {
  rates: {
    message: string;
    rates: CourierRate[];
  };
}

// Estimate parcel dimensions based on total weight
// Biltong is relatively dense — typical packaging:
// - 50g-150g: small padded bag (~20x15x5cm)
// - 500g: medium box (~25x20x10cm)
// - 1kg: larger box (~30x25x12cm)
// Multi-item orders scale up proportionally
function estimateParcel(items: { name: string; qty: number; weight_grams: number }[]) {
  let totalWeightKg = 0;
  let totalItems = 0;

  for (const item of items) {
    totalWeightKg += (item.weight_grams / 1000) * item.qty;
    totalItems += item.qty;
  }

  // Ensure minimum weight of 1kg for courier (they round up anyway)
  totalWeightKg = Math.max(totalWeightKg, 1);

  // Estimate dimensions based on weight
  // Use volumetric weight formula: L x W x H / 4000 (SA courier standard)
  // We want actual weight to be > volumetric weight to avoid surcharges
  const volumeCm3 = totalWeightKg * 4000; // Target volumetric = actual

  // Proportional box: 1.5:1:0.6 ratio (L:W:H)
  const h = Math.cbrt(volumeCm3 / 0.9); // 0.9 = 1.5 * 1 * 0.6
  const l = Math.ceil(h * 1.5);
  const w = Math.ceil(h);
  const height = Math.ceil(h * 0.6);

  return {
    submitted_length_cm: Math.max(l, 20),
    submitted_width_cm: Math.max(w, 15),
    submitted_height_cm: Math.max(height, 5),
    submitted_weight_kg: Math.round(totalWeightKg * 100) / 100,
    submitted_description: `Biltong order (${totalItems} item${totalItems !== 1 ? "s" : ""})`,
    item_count: 1, // Single package for now
  };
}

// Product weight lookup
const PRODUCT_WEIGHTS: Record<string, number> = {
  "The Taster": 50,
  "Snack Pack": 150,
  "Family Batch": 500,
  "The Feast": 1000,
};

export async function getShippingRates(
  deliveryAddress: {
    street_address: string;
    local_area: string;
    city: string;
    zone: string;
    code: string;
  },
  items: { name: string; qty: number }[]
): Promise<CourierRate[]> {
  const parcels = [
    estimateParcel(
      items.map((i) => ({
        name: i.name,
        qty: i.qty,
        weight_grams: PRODUCT_WEIGHTS[i.name] || 150,
      }))
    ),
  ];

  // Calculate declared value for insurance (total order value)
  const declaredValue = 0; // No insurance for now — keeps rates lower

  const body = {
    collection_address: COLLECTION_ADDRESS,
    delivery_address: {
      ...deliveryAddress,
      country: "ZA",
    },
    parcels,
    declared_value: declaredValue,
  };

  const res = await tcgFetch("/rates", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[CourierGuy] Rates API error:", res.status, errorText);
    throw new Error(`Courier Guy API error: ${res.status}`);
  }

  const data: RatesResponse = await res.json();

  if (data.rates?.message !== "Success" || !data.rates?.rates?.length) {
    console.warn("[CourierGuy] No rates returned:", JSON.stringify(data));
    return [];
  }

  return data.rates.rates;
}

// ============================================
// SHIPMENT CREATION
// ============================================

export interface CreateShipmentResult {
  id: string;
  short_tracking_reference: string;
}

export async function createShipment(params: {
  deliveryAddress: {
    street_address: string;
    local_area: string;
    city: string;
    zone: string;
    code: string;
  };
  deliveryContact: {
    name: string;
    mobile_number: string;
    email: string;
  };
  items: { name: string; qty: number }[];
  serviceLevelId: number;
  customerReference: string;
  specialInstructions?: string;
}): Promise<CreateShipmentResult> {
  const parcels = [
    estimateParcel(
      params.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        weight_grams: PRODUCT_WEIGHTS[i.name] || 150,
      }))
    ),
  ];

  const body = {
    collection_address: COLLECTION_ADDRESS,
    collection_contact: COLLECTION_CONTACT,
    delivery_address: {
      ...params.deliveryAddress,
      country: "ZA",
    },
    delivery_contact: params.deliveryContact,
    parcels,
    service_level_id: params.serviceLevelId,
    declared_value: 0,
    customer_reference: params.customerReference,
    special_instructions_collection: "",
    special_instructions_delivery: params.specialInstructions || "",
  };

  const res = await tcgFetch("/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[CourierGuy] Shipment creation error:", res.status, errorText);
    throw new Error(`Courier Guy shipment error: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    short_tracking_reference: data.short_tracking_reference,
  };
}

// ============================================
// TRACKING
// ============================================

export interface TrackingEvent {
  status: string;
  timestamp: string;
  location: string;
  details: string;
}

export async function trackShipment(shipmentId: string): Promise<TrackingEvent[]> {
  const res = await tcgFetch(`/shipments/${shipmentId}/tracking`);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[CourierGuy] Tracking error:", res.status, errorText);
    throw new Error(`Courier Guy tracking error: ${res.status}`);
  }

  const data = await res.json();
  return data.tracking_events || [];
}

export async function trackByReference(trackingRef: string): Promise<{
  id: string;
  short_tracking_reference: string;
  status: string;
  tracking_events: TrackingEvent[];
} | null> {
  const res = await tcgFetch(`/shipments?tracking_reference=${encodeURIComponent(trackingRef)}`);

  if (!res.ok) {
    console.error("[CourierGuy] Track by ref error:", res.status);
    return null;
  }

  const data = await res.json();
  return data.shipments?.[0] || null;
}

// ============================================
// LABEL
// ============================================

export async function getShipmentLabel(shipmentId: string): Promise<string | null> {
  const res = await tcgFetch(`/shipments/label?id=${shipmentId}`);

  if (!res.ok) {
    console.error("[CourierGuy] Label error:", res.status);
    return null;
  }

  const data = await res.json();
  return data.url || null;
}

// ============================================
// STANGER DETECTION
// ============================================

// Check if an address is in Stanger/KwaDukuza
export function isStangerAddress(address: string): boolean {
  const lower = address.toLowerCase();
  return (
    lower.includes("stanger") ||
    lower.includes("kwadukuza") ||
    lower.includes("kwa dukuza")
  );
}

// Parse a free-text SA address into structured format for the API
// This is a best-effort parser — SA addresses vary widely
export function parseSAAddress(address: string): {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
} {
  const parts = address.split(",").map((p) => p.trim());

  // SA province mapping
  const provinces: Record<string, string> = {
    "kwazulu-natal": "KwaZulu-Natal",
    "kzn": "KwaZulu-Natal",
    gauteng: "Gauteng",
    "western cape": "Western Cape",
    "eastern cape": "Eastern Cape",
    "free state": "Free State",
    "mpumalanga": "Mpumalanga",
    limpopo: "Limpopo",
    "north west": "North West",
    "northwest": "North West",
    "northern cape": "Northern Cape",
  };

  let street_address = "";
  let local_area = "";
  let city = "";
  let zone = "";
  let code = "";

  // Try to extract postal code (4 digits)
  const postalMatch = address.match(/\b(\d{4})\b/);
  if (postalMatch) {
    code = postalMatch[1];
  }

  // Try to find province
  for (const [key, value] of Object.entries(provinces)) {
    if (address.toLowerCase().includes(key)) {
      zone = value;
      break;
    }
  }

  // Simple parsing logic based on comma-separated parts
  if (parts.length >= 4) {
    // Format: "12 Main Rd, Suburb, City, Province, 2000"
    street_address = parts[0];
    local_area = parts[1];
    city = parts[2];
    if (!zone) zone = parts[3];
  } else if (parts.length === 3) {
    street_address = parts[0];
    local_area = parts[1];
    city = parts[2];
  } else if (parts.length === 2) {
    street_address = parts[0];
    city = parts[1];
  } else {
    street_address = address;
    city = "Unknown";
  }

  // Default zone to KZN if we can't determine
  if (!zone) zone = "KwaZulu-Natal";

  return { street_address, local_area, city, zone, code };
}
