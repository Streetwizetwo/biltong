// Test the /api/orders endpoint to reproduce the bug
const TEST_ORDER = {
  order_id: `BB-TEST-${Date.now()}`,
  customer_name: "DIAG TEST",
  customer_phone: "0700000000",
  customer_email: null,
  items: [
    // The cart stores names like "Snack Pack 150g" (name + weight)
    { name: "Snack Pack 150g", flavor: "Chilli", price: 100, qty: 1 },
  ],
  items_summary: "1x Snack Pack 150g [Chilli]",
  subtotal: 100,
  delivery_fee: 0,
  total: 100,
  delivery_mode: "collect",
  delivery_address: null,
  payment_method: "ikhokha",
  payment_status: "pending",
  order_status: "new",
};

async function main() {
  console.log("=== Testing POST /api/orders with realistic cart data ===");
  console.log("Cart item name:", TEST_ORDER.items[0].name);
  console.log("(This is what the actual cart stores — name + weight combined)\n");

  try {
    const res = await fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_ORDER),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response: ${text}`);

    if (res.status === 400) {
      console.log("\n>>> BUG CONFIRMED: Server rejects order because it can't find 'Snack Pack 150g' in its price map (which only has 'Snack Pack')");
    } else if (res.ok) {
      console.log("\n>>> Order saved successfully (different cause)");
    } else {
      console.log("\n>>> Other error — investigate further");
    }
  } catch (err) {
    console.log("Could not reach localhost:3000 — server not running. Testing Supabase directly to confirm product name mismatch...\n");

    // Direct test: try inserting with current cart-style name to see if Supabase rejects it
    const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

    // Just verify by reading back any historical order to see what items look like
    const histRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=items,items_summary&limit=3`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const histData = await histRes.json();
    console.log("Historical order items (showing what was being saved):");
    histData.forEach((o: any, i: number) => {
      console.log(`  [${i}] items_summary: ${o.items_summary}`);
      console.log(`       items: ${JSON.stringify(o.items)}`);
    });
  }
}

main().catch(console.error);
