// Supabase configuration for Biltong & Bytes
// Orders are saved via the API route to keep the anon key server-side

// Supabase project URL — read from env so swapping projects doesn't require code changes.
// Set NEXT_PUBLIC_SUPABASE_URL in Vercel Project Settings → Environment Variables.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder.supabase.co";

export const IKHOKHA_PAYMENT_URL =
  "https://pay.ikhokha.com/biltongandbytes/mpr/online";

export const WHATSAPP_NUMBER = "27636402722";

export interface OrderData {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: { name: string; flavor: string; price: number; qty: number }[];
  items_summary: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_mode: string;
  delivery_address: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
}

export function generateOrderId(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BB${y}${m}${d}-${rand}`;
}

export function buildWhatsAppMessage(orderData: OrderData): string {
  let msg = "🥩 *BILTONG & BYTES ORDER*\n";
  msg += `📋 Order ID: ${orderData.order_id}\n\n`;

  orderData.items.forEach((item) => {
    const flavorStr = item.flavor ? ` [${item.flavor}]` : "";
    msg += `• ${item.qty}x ${item.name}${flavorStr} — R${item.price * item.qty}\n`;
  });

  msg += `\n💰 Subtotal: R${orderData.subtotal}`;
  if (orderData.delivery_fee > 0)
    msg += `\n🚚 Delivery fee: R${orderData.delivery_fee}`;
  msg += `\n💎 TOTAL: R${orderData.total}`;

  if (orderData.customer_name) msg += `\n\n👤 Name: ${orderData.customer_name}`;
  if (orderData.customer_phone)
    msg += `\n📱 Phone: ${orderData.customer_phone}`;

  if (orderData.delivery_mode === "stanger") {
    msg += `\n🏠 Stanger Delivery: ${orderData.delivery_address || "TBD"}`;
  } else if (orderData.delivery_mode === "nationwide") {
    msg += `\n🏠 Nationwide Delivery: ${orderData.delivery_address || "TBD"}`;
  } else if (orderData.delivery_mode === "deliver") {
    msg += `\n🏠 Delivery: ${orderData.delivery_address || "TBD"}`;
  } else {
    msg += `\n📍 Collection in Stanger`;
  }

  if (orderData.payment_method === "ikhokha") {
    msg += `\n\n💳 Payment: iKhokha (pending)`;
    msg += `\n🔗 Pay here: ${IKHOKHA_PAYMENT_URL}?amount=${orderData.total.toFixed(2)}`;
    msg += `\n📌 Reference: ${orderData.order_id}`;
  } else {
    msg += `\n\n💵 Payment: Cash/Card on ${
      orderData.delivery_mode !== "collect" ? "delivery" : "collection"
    }`;
  }

  msg += "\n\n🤲 JazakAllah Khair!";
  return msg;
}

// ============================================
// PRODUCT TYPE
// ============================================
// Matches the row returned by /api/products (and the products table in Supabase).
// `badge` is null or one of: "Popular", "Best Value" — drives the storefront badge UI.
export interface Product {
  id: number;
  name: string;
  weight: string;
  grams: number;
  price: number;
  description: string;
  img: string;
  badge: string | null;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================
// FALLBACK PRODUCTS
// ============================================
// Used only if /api/products is unreachable. The storefront fetches live
// products on mount; this is a safety net so the page still renders if
// Supabase is down.
export const PRODUCTS: Product[] = [
  {
    id: 0,
    name: "The Taster",
    weight: "50g",
    grams: 50,
    price: 35,
    img: "/images/taster-50g.webp",
    description: "Perfect bite-sized sample of our premium wet biltong",
    badge: null,
    is_active: true,
    sort_order: 0,
  },
  {
    id: 1,
    name: "Snack Pack",
    weight: "150g",
    grams: 150,
    price: 100,
    img: "/images/snack-pack-150g.jpeg",
    description: "Ideal for snacking — great for on-the-go cravings",
    badge: null,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: "Family Batch",
    weight: "500g",
    grams: 500,
    price: 300,
    img: "/images/family-batch-500g.webp",
    description: "Share with the family — the crowd favourite size",
    badge: "Popular",
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: "The Feast",
    weight: "1kg",
    grams: 1000,
    price: 550,
    img: "/images/feast-1kg.jpeg",
    description: "The ultimate biltong experience — best value per gram",
    badge: "Best Value",
    is_active: true,
    sort_order: 3,
  },
];

// ============================================
// DEAL TYPE
// ============================================
// A bundle deal (e.g. "3 × Taster Packs – R139, save R8").
// `items` is denormalized so the storefront can render deal cards without
// joining the products table — the admin editor writes product_id + name +
// weight + img together so deleting a product later doesn't break the card.
export interface DealItem {
  product_id: number;
  product_name: string;
  quantity: number;
  weight: string;
  img: string;
}

export interface Deal {
  id: number;
  name: string;
  description: string;
  items: DealItem[];
  price: number;
  original_price: number;
  savings: number;
  img: string;
  badge: string | null;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================
// FALLBACK DEALS
// ============================================
// Used only if /api/deals is unreachable. The storefront fetches live
// deals on mount; this is a safety net so the deals section still renders
// if Supabase is down. Prices here match the seed in supabase/schema.sql.
export const DEALS: Deal[] = [
  {
    id: 1,
    name: "Triple Taster Saver",
    description: "Three taster packs of our premium wet biltong — perfect to share or stock your snack drawer.",
    items: [
      { product_id: 1, product_name: "The Taster", quantity: 3, weight: "50g", img: "/images/taster-50g.webp" },
    ],
    price: 139,
    original_price: 147,
    savings: 8,
    img: "/images/taster-50g.webp",
    badge: "Save R8",
    is_active: true,
    sort_order: 0,
  },
  {
    id: 2,
    name: "Double Snack Pack",
    description: "Two snack packs — double the flavour, less the price. Great for on-the-go cravings.",
    items: [
      { product_id: 2, product_name: "Snack Pack", quantity: 2, weight: "150g", img: "/images/snack-pack-150g.jpeg" },
    ],
    price: 249,
    original_price: 258,
    savings: 9,
    img: "/images/snack-pack-150g.jpeg",
    badge: "Save R9",
    is_active: true,
    sort_order: 1,
  },
  {
    id: 3,
    name: "Family + Taster Combo",
    description: "A family batch for the household plus two taster packs to try something new.",
    items: [
      { product_id: 3, product_name: "Family Batch", quantity: 1, weight: "500g", img: "/images/family-batch-500g.webp" },
      { product_id: 1, product_name: "The Taster", quantity: 2, weight: "50g", img: "/images/taster-50g.webp" },
    ],
    price: 439,
    original_price: 447,
    savings: 8,
    img: "/images/family-batch-500g.webp",
    badge: "Save R8",
    is_active: true,
    sort_order: 2,
  },
  {
    id: 4,
    name: "Double Feast",
    description: "Two kilograms of the ultimate biltong experience — best value per gram, doubled.",
    items: [
      { product_id: 4, product_name: "The Feast", quantity: 2, weight: "1kg", img: "/images/feast-1kg.jpeg" },
    ],
    price: 1250,
    original_price: 1298,
    savings: 48,
    img: "/images/feast-1kg.jpeg",
    badge: "Save R48",
    is_active: true,
    sort_order: 3,
  },
];

export const FLAVORS = ["Traditional", "Chilli", "Hot Honey Glazed"];
