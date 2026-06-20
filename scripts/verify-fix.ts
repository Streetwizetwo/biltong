// Verify the order API fix works with REAL cart-style data
const TEST_ORDER = {
  order_id: `BB-VERIFY-${Date.now()}`,
  customer_name: "VERIFY TEST",
  customer_phone: "0700000000",
  customer_email: null,
  items: [
    { name: "Snack Pack 150g", flavor: "Chilli", price: 100, qty: 1 },
    { name: "The Feast 1kg", flavor: "Traditional", price: 550, qty: 1 },
  ],
  items_summary: "1x Snack Pack 150g [Chilli], 1x The Feast 1kg [Traditional]",
  subtotal: 650,
  delivery_fee: 0,
  total: 650,
  delivery_mode: "collect",
  delivery_address: null,
  payment_method: "ikhokha",
  payment_status: "pending",
  order_status: "new",
};

async function main() {
  console.log("=== Verifying order API fix with realistic cart data ===\n");
  console.log("Cart items being submitted:");
  TEST_ORDER.items.forEach(i => console.log(`  - ${i.name} [${i.flavor}] x${i.qty} @ R${i.price}`));
  console.log(`\nTotal claimed: R${TEST_ORDER.total}\n`);

  const res = await fetch("http://localhost:3199/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_ORDER),
  });

  console.log(`HTTP Status: ${res.status} ${res.statusText}`);
  const body = await res.json();
  console.log(`Response: ${JSON.stringify(body, null, 2)}`);

  if (res.ok) {
    console.log("\n>>> SUCCESS: Order saved to Supabase!");
    console.log(`>>> Saved order_id: ${body.data?.[0]?.order_id}`);
    console.log(`>>> Saved total: R${body.data?.[0]?.total}`);
    console.log(`>>> Saved items count: ${body.data?.[0]?.items?.length}`);
    console.log(`>>> First item flavor in DB: ${body.data?.[0]?.items?.[0]?.flavor}`);
  } else {
    console.log("\n>>> STILL FAILING — investigate further");
  }

  // Clean up: soft-delete the test order so it doesn't clutter the admin
  console.log("\n=== Cleaning up test order ===");
  const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";
  await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${TEST_ORDER.order_id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ order_status: "deleted", payment_status: "cancelled" }),
  });
  console.log(`Marked test order ${TEST_ORDER.order_id} as deleted`);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
