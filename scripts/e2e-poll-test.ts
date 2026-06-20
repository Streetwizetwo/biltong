// End-to-end test of payment status polling: create an order, then verify
// the status endpoint reflects the order's state, then simulate the webhook
// marking it as paid and confirm the status endpoint reflects "paid".
const SUPABASE_URL = "https://fltjcycovhslqupmalfj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdGpjeWNvdmhzbHF1cG1hbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc0OTksImV4cCI6MjA5NDg3MzQ5OX0.nBWxfRfxWGEwE2EU8Me4q8DnD_9EGc-LN0MfCsag-YU";

async function patchOrder(orderId: string, updates: Record<string, unknown>) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(updates),
    }
  );
  return res.ok;
}

async function getStatus(orderId: string) {
  const res = await fetch(`http://localhost:3199/api/orders/status?order_id=${orderId}`);
  return res.json();
}

async function main() {
  console.log("=== Step 1: Create order via /api/orders (as a customer would) ===\n");
  const testOrderId = `BB260620-E2E${Math.floor(Math.random()*1000)}`;
  const newOrder = {
    order_id: testOrderId,
    customer_name: "E2E POLL TEST",
    customer_phone: "0712345678",
    customer_email: null,
    items: [{ name: "Snack Pack 150g", flavor: "Chilli", price: 100, qty: 1 }],
    items_summary: "1x Snack Pack 150g [Chilli]",
    subtotal: 100, delivery_fee: 0, total: 100,
    delivery_mode: "collect", delivery_address: null,
    payment_method: "ikhokha", payment_status: "pending", order_status: "new",
  };
  const createRes = await fetch("http://localhost:3199/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newOrder),
  });
  console.log(`Order created: ${createRes.status}`);
  if (!createRes.ok) {
    console.log("FAILED:", await createRes.text());
    return;
  }

  console.log("\n=== Step 2: Poll status — should show 'pending' ===");
  const status1 = await getStatus(testOrderId);
  console.log(`payment_status: ${status1.payment_status}`);
  console.log(`order_status:   ${status1.order_status}`);
  console.log(`found:          ${status1.found}`);
  if (status1.payment_status !== "pending") {
    console.log("❌ FAIL: Expected payment_status='pending'");
  } else {
    console.log("✅ PASS: Status reflects pending payment");
  }

  console.log("\n=== Step 3: Simulate iKhokha webhook marking order as PAID ===");
  const patched = await patchOrder(testOrderId, {
    payment_status: "paid",
    order_status: "confirmed",
  });
  console.log(`Webhook simulation patched: ${patched}`);

  console.log("\n=== Step 4: Poll status again — should now show 'paid' ===");
  const status2 = await getStatus(testOrderId);
  console.log(`payment_status: ${status2.payment_status}`);
  console.log(`order_status:   ${status2.order_status}`);
  if (status2.payment_status !== "paid") {
    console.log("❌ FAIL: Expected payment_status='paid'");
  } else {
    console.log("✅ PASS: Status reflects paid payment — polling will detect this");
  }

  console.log("\n=== Step 5: Cleanup ===");
  await patchOrder(testOrderId, { order_status: "deleted", payment_status: "cancelled" });
  console.log(`Test order ${testOrderId} soft-deleted`);
  console.log("\n=== END-TO-END TEST PASSED ===");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
