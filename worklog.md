---
Task ID: 1
Agent: Main
Task: Remove Courier Guy API and address search, simplify to plain text address input with flat delivery fee

Work Log:
- Read all key project files to understand the codebase state
- Rewrote Zustand store (store.ts) — removed ShippingRate, StructuredAddress, isStangerDelivery, availableRates, selectedRate, ratesLoading, structuredAddress. Added version 3 migration to strip old shipping state.
- Replaced AddressAutocomplete component — was 410 lines with Geoapify autocomplete, portals, dropdowns. Now 50 lines — simple text input with MapPin icon.
- Rewrote CheckoutModal in page.tsx — removed all shipping rate fetching logic, Courier Guy shipment creation, rate selection UI, Stanger detection logic. Simple flow: customer info → address text input → flat delivery fee → iKhokha/WhatsApp payment.
- Simplified orders API route — removed Courier Guy rate verification. Now uses flat delivery fee from settings for all deliveries.
- Deleted 5 API route files: places/autocomplete, places/details, shipping/rates, shipping/create-shipment, shipping/track
- Deleted courier-guy.ts (390 lines)
- Cleaned up next.config.ts CSP — removed shiplogic, geoapify, thecourierguy domains
- Cleaned up .env.local — removed COURIER_GUY_API_KEY and GEOAPIFY_API_KEY
- Removed STANGER_ADDRESSES and SA_CITIES static arrays from supabase.ts
- Updated Footer text: "R40 flat delivery fee nationwide" instead of Courier Guy references
- Updated CartDrawer text: "R40 flat fee" instead of "Courier Nationwide"
- Updated HowToOrderSection step 4: "R40 delivery · Free collection"
- Updated OrderSuccess — removed tracking reference display for Courier Guy
- Build succeeded with no errors
- Committed locally but could NOT push to GitHub (no auth token available)

Stage Summary:
- Net code deletion: -1710 lines, +63 lines
- 6 files deleted entirely
- Courier Guy API fully removed
- Geoapify API fully removed
- Address input is now a simple text field
- Flat R40 delivery fee (configurable in admin settings)
- iKhokha payment gateway preserved
- Address saved to Supabase and shown in admin panel
- NEEDS: User to push to GitHub or add auth token for auto-deploy
---
Task ID: 1
Agent: Main Agent
Task: Remove Courier Guy API and address autocomplete, simplify checkout

Work Log:
- Read all key project files to understand current state
- Discovered the codebase was already mostly cleaned up from previous sessions
- AddressAutocomplete was already simplified to a basic text input, but was an unnecessary separate component
- Deleted src/components/AddressAutocomplete.tsx
- Inlined the address text input directly in CheckoutModal in page.tsx
- Removed shipping_carrier and tracking_reference fields from OrderData type in supabase.ts
- Removed shipping_carrier and tracking_reference from order creation in CheckoutModal
- Removed Courier Guy shipping fields from orders API PATCH endpoint
- Verified .env.local is already clean (no Courier Guy / Geoapify keys)
- Build verified successfully with no errors
- Committed and pushed to GitHub using user's PAT token
- Vercel will auto-deploy

Stage Summary:
- All Courier Guy API remnants removed
- Address autocomplete removed, replaced with simple inline text input
- Address is captured in Supabase and shown in admin panel
- iKhokha payment gateway kept intact
- Changes pushed to GitHub, Vercel auto-deploy triggered

---
Task ID: 2
Agent: Main Agent
Task: Revert WhatsApp order notifications — keep all order details in admin panel only, keep customer payment-approved feedback

Work Log:
- Read page.tsx to map all WhatsApp integration points (handleWhatsAppCash, handleIkhokha, handleConfirmWhatsApp, sendOrderToWhatsApp, startPaymentPolling, OrderSuccess, payment verification UI)
- Removed `buildWhatsAppMessage` from page.tsx imports (function left in supabase.ts in case of future re-enablement)
- Removed `whatsappSentRef` state entirely
- Renamed `handleWhatsAppCash` -> `handleCashOnCollection`: now only saves order + shows success toast, no WhatsApp window.open
- Cleaned `handleIkhokha`: removed both `sendOrderToWhatsApp(orderData, "pending")` calls (in main flow + network-failure fallback); removed `whatsappSentRef.current = false` reset
- Replaced `handleConfirmWhatsApp` with `handleConfirmPaid`: now PATCHes the order directly to payment_status="paid" + order_status="confirmed" via /api/orders, clears poller, sets approved state, no WhatsApp window.open
- Removed the entire `sendOrderToWhatsApp` function definition
- Updated `startPaymentPolling`: removed the `sendOrderToWhatsApp(orderData, "paid")` call on approval, removed the dependency from useCallback deps array
- Updated "Payment Approved!" screen text: "Your order is confirmed. We'll start preparing your biltong fresh." (was: "...We've notified the team on WhatsApp.")
- Updated manual-confirm fallback button: green colour, `CheckCircle2` icon, label "I'VE PAID — CONFIRM ORDER", onClick={handleConfirmPaid} (was WhatsApp-green with MessageCircle icon, "I'VE PAID — CONFIRM ON WHATSAPP")
- Renamed cash button label: "CASH / CARD ON COLLECTION" (was "WHATSAPP (Cash/Card on Collection)")
- Updated OrderSuccess heading to be conditional: "Payment Approved!" for iKhokha, "Order Placed!" for cash
- Updated OrderSuccess body text: iKhokha="Payment received! Your order is confirmed — we'll start preparing your biltong fresh."; cash="Your order is in our system. Pay cash or card when you collect in Stanger."
- Updated bottom payment-info note: "Cash / Card: Pay when you collect in Stanger." (was "WhatsApp: Pay cash or card when you collect.")
- Verified `WHATSAPP_NUMBER` still used only for 3 general contact links in footer/nav (legitimate customer-facing "Chat with us" entry points, not order notifications)
- TypeScript compile check passed (only pre-existing framer-motion ease-type warnings remain)
- `npx next build` succeeded — compiled in 5.9s, 12 static pages generated
- Committed + pushed to GitHub (884a515..63c1ce2 main -> main) — Vercel will auto-deploy

Stage Summary:
- WhatsApp order-notification flow fully reverted
- Customer still gets clear "Payment Approved!" feedback via iKhokha webhook polling
- Customer still gets a manual "I've Paid — Confirm Order" fallback button (PATCHes order as paid, no WhatsApp)
- All order details still saved to Supabase and visible in admin panel (unchanged)
- 1 file changed, 44 insertions, 48 deletions (net -4 lines)
- Pushed to GitHub; Vercel auto-deploy triggered
