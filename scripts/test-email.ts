// Test the email endpoint end-to-end with a realistic order payload
const testOrder = {
  order_id: "BB260621-TEST",
  customer_name: "Test Customer",
  customer_phone: "0821234567",
  customer_email: "test@example.com", // Will fail with onboarding sender — expected
  items: [
    { name: "Snack Pack 150g", flavor: "Traditional", price: 100, qty: 2 },
    { name: "Family Batch 500g", flavor: "Chilli", price: 300, qty: 1 },
  ],
  items_summary: "2x Snack Pack 150g [Traditional], 1x Family Batch 500g [Chilli]",
  subtotal: 500,
  delivery_fee: 40,
  total: 540,
  delivery_mode: "stanger",
  delivery_address: "12 Test Street, Stanger",
  payment_method: "ikhokha",
  payment_status: "paid",
  order_status: "confirmed",
};

async function main() {
  console.log("→ Sending test order to /api/email/order-confirmation...");
  const res = await fetch("http://127.0.0.1:3199/api/email/order-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testOrder),
  });
  const data = await res.json();
  console.log("← Status:", res.status);
  console.log("← Response:", JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
