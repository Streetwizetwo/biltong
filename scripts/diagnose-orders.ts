// Diagnostic script: query Supabase orders table directly to see what's there
const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

async function fetchJSON(url: string, label: string) {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      console.log(`Count: ${json.length}`);
      if (json.length > 0) {
        console.log(`First item keys:`, Object.keys(json[0]));
        console.log(`Last 3 orders:`);
        json.slice(-3).forEach((o: any, i: number) => {
          console.log(
            `  [${i}] ${o.order_id} | ${o.customer_name} | R${o.total} | ` +
            `pay=${o.payment_status} | status=${o.order_status} | ` +
            `created=${o.created_at} | method=${o.payment_method} | ` +
            `mode=${o.delivery_mode}`
          );
        });
      }
    } else {
      console.log(`Response:`, JSON.stringify(json, null, 2).slice(0, 2000));
    }
  } catch {
    console.log(`Raw response (first 2000 chars):`, text.slice(0, 2000));
  }
}

async function main() {
  console.log("========================================");
  console.log("BILTONG & BYTES — ORDER DIAGNOSTIC");
  console.log("========================================");
  console.log(`Time: ${new Date().toISOString()}`);

  // 1. Total orders (including deleted)
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,customer_name,customer_phone,total,payment_status,order_status,payment_method,delivery_mode,created_at&order=created_at.desc&limit=50`,
    "LAST 50 ORDERS (ALL STATUSES)"
  );

  // 2. Non-deleted orders (what admin should show)
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,customer_name,customer_phone,total,payment_status,order_status,payment_method,delivery_mode,created_at&order=created_at.desc&order_status=neq.deleted&limit=50`,
    "NON-DELETED ORDERS (what admin should display)"
  );

  // 3. Paid orders specifically
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,customer_name,customer_phone,total,payment_status,order_status,payment_method,delivery_mode,created_at&order=created_at.desc&payment_status=eq.paid&limit=50`,
    "PAID ORDERS"
  );

  // 4. Count by status
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_status`,
    "ALL ORDER STATUSES (for grouping)"
  );

  // 5. Today's orders
  const today = new Date().toISOString().slice(0, 10);
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,customer_name,customer_phone,total,payment_status,order_status,created_at&order=created_at.desc&created_at=gte.${today}T00:00:00&limit=50`,
    `ORDERS FROM TODAY (${today})`
  );

  // 6. Recent 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await fetchJSON(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,customer_name,customer_phone,total,payment_status,order_status,created_at&order=created_at.desc&created_at=gte.${sevenDaysAgo}&limit=100`,
    `ORDERS FROM LAST 7 DAYS (since ${sevenDaysAgo})`
  );

  console.log("\n========================================");
  console.log("DIAGNOSTIC COMPLETE");
  console.log("========================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
