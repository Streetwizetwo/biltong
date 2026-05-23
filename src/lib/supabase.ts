// Supabase configuration for Biltong & Bytes
// Orders are saved via the API route to keep the anon key server-side

export const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";

export const IKHOKHA_PAYMENT_URL =
  "https://pay.ikhokha.com/biltongandbytes/mpr/online";

export const WHATSAPP_NUMBER = "27636402722";

export interface OrderData {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: { name: string; price: number; qty: number }[];
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
    msg += `• ${item.qty}x ${item.name} — R${item.price * item.qty}\n`;
  });

  msg += `\n💰 Subtotal: R${orderData.subtotal}`;
  if (orderData.delivery_fee > 0)
    msg += `\n🚚 Delivery fee: R${orderData.delivery_fee}`;
  msg += `\n💎 TOTAL: R${orderData.total}`;

  if (orderData.customer_name) msg += `\n\n👤 Name: ${orderData.customer_name}`;
  if (orderData.customer_phone)
    msg += `\n📱 Phone: ${orderData.customer_phone}`;

  if (orderData.delivery_mode === "deliver") {
    msg += `\n🏠 Delivery: ${orderData.delivery_address || "TBD"}`;
  } else {
    msg += `\n📍 Collection in Stanger`;
  }

  if (orderData.payment_method === "ikhokha") {
    msg += `\n\n💳 Payment: iKhokha (pending)`;
    msg += `\n🔗 Pay here: ${IKHOKHA_PAYMENT_URL}`;
    msg += `\n📌 Reference: ${orderData.order_id}`;
  } else {
    msg += `\n\n💵 Payment: Cash/Card on ${
      orderData.delivery_mode === "deliver" ? "delivery" : "collection"
    }`;
  }

  msg += "\n\n🤲 JazakAllah Khair!";
  return msg;
}

export const STANGER_ADDRESSES = [
  "King Street, Stanger",
  "Queen Street, Stanger",
  "Prince Edward Road, Stanger",
  "Victoria Street, Stanger",
  "Church Street, Stanger",
  "Market Street, Stanger",
  "Mahatma Gandhi Road, Stanger",
  "Ridge Road, Stanger",
  "Hibiscus Street, Stanger",
  "Acacia Road, Stanger",
  "Umvoti Drive, Stanger",
  "Shakaskraal Road, Stanger",
  "Glendale, Stanger",
  "Kearsney, Stanger",
  "Mandini Road, Stanger",
  "Blake Street, Stanger",
  "Campbell Road, Stanger",
  "Chapel Street, Stanger",
  "Commercial Road, Stanger",
  "Durban Road, Stanger",
  "Stanger Manor",
  "Sugar Valley, Stanger",
  "Newtown, Stanger",
  "The Ridge, Stanger",
];

export const PRODUCTS = [
  {
    id: 0,
    name: "The Taster",
    weight: "50g",
    grams: 50,
    price: 35,
    img: "https://t4.ftcdn.net/jpg/00/41/14/91/360_F_41149170_hkxBmCVDZgbokGTiw5MjRV0nMfOzLv3t.jpg",
    description: "Perfect bite-sized sample of our premium wet biltong",
  },
  {
    id: 1,
    name: "Snack Pack",
    weight: "150g",
    grams: 150,
    price: 100,
    img: "https://img.freepik.com/free-photo/sliced-stick-biltong-snack-rosemary-seasoning-wooden-surface_181624-12920.jpg",
    description: "Ideal for snacking — great for on-the-go cravings",
  },
  {
    id: 2,
    name: "Family Batch",
    weight: "500g",
    grams: 500,
    price: 300,
    img: "https://www.biltongboyz.com/wp-content/uploads/2018/12/sliced-spicy-biltong.jpg",
    description: "Share with the family — the crowd favourite size",
  },
  {
    id: 3,
    name: "The Feast",
    weight: "1kg",
    grams: 1000,
    price: 550,
    img: "https://boerie.co/cdn/shop/files/Chilli_Biltong_03_1024x1024@2x.jpg?v=1746100500",
    description: "The ultimate biltong experience — best value per gram",
  },
];

export const FLAVORS = ["Traditional", "Chilli", "Honey Glazed"];
