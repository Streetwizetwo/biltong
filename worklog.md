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

---
Task ID: 3
Agent: Main Agent
Task: Add email notifications via Resend — customer + merchant emails on every order

Work Log:
- Asked user clarifying questions: chose onboarding@resend.dev sender (test mode, no DNS setup)
- User provided Resend API key: re_hvN86L63_...
- Installed `resend` npm package
- Created /home/z/my-project/.env.local (gitignored) with:
  * RESEND_API_KEY
  * MERCHANT_EMAIL=khadertahir@gmail.com (initially set to orders@biltongandbytes.co.za, then corrected after Resend revealed account email)
  * RESEND_FROM_EMAIL=onboarding@resend.dev
- Created /api/email/order-confirmation/route.ts with:
  * Two branded HTML email templates (customer + merchant)
  * Site palette: dark brown background (#0A0301), gold accents (#E5B83C), cream text (#FEF3DF)
  * Order summary table with items, flavors, qty, line totals, delivery fee, total
  * Customer email: order ref card, delivery details, "Payment Approved!" or "Order Received!" heading based on payment_status, 3-day prep note
  * Merchant email: full customer details (name/phone/email/address), order ID, payment + status badges, link to admin panel
  * Graceful degradation: returns 200 even on email failure, never blocks order flow
  * Skips customer email if customer_email is null
- Wired sendOrderEmails() helper into all 3 order flows in page.tsx:
  * handleCashOnCollection: fires immediately when cash order placed (payment_status='cash_on_delivery')
  * startPaymentPolling: fires when iKhokha webhook confirms payment (overlays payment_status='paid' on orderData)
  * handleConfirmPaid: fires when customer manually confirms payment (overlays payment_status='paid')
- Updated email field placeholder in checkout form: "Your Email (for order confirmation)"
- Tested end-to-end via scripts/test-email.ts:
  * First test: Resend returned 403 validation_error — confirmed API key is valid, revealed account email is khadertahir@gmail.com
  * Corrected MERCHANT_EMAIL in .env.local
  * Second test: BOTH customer + merchant emails sent successfully (got email IDs from Resend API)
- Build succeeded: /api/email/order-confirmation route registered as dynamic server-rendered endpoint
- Committed + pushed to GitHub (63c1ce2..c5bbd6a main -> main) — Vercel will auto-deploy

Stage Summary:
- Email notifications fully wired for both cash + iKhokha order flows
- Both emails tested successfully end-to-end via Resend API
- Currently in TEST MODE: onboarding@resend.dev sender only delivers to khadertahir@gmail.com
- To enable production emails to any customer inbox: verify biltongandbytes.co.za in Resend dashboard, add DNS records, change RESEND_FROM_EMAIL env var on Vercel
- All order details still saved to admin panel (unchanged)
- All previous WhatsApp revert logic preserved (no regression)
- 5 files changed, 550 insertions, 2 deletions
- Pushed to GitHub; Vercel auto-deploy triggered
- ACTION REQUIRED: User must add RESEND_API_KEY, MERCHANT_EMAIL, RESEND_FROM_EMAIL env vars on Vercel Project Settings -> Environment Variables

---
Task ID: 4
Agent: Main Agent
Task: Fix iKhokha payment link not opening (popup-blocker issue) + clean up stale routes

Work Log:
- Diagnosed root cause: window.open() was being called AFTER multiple awaits (saveOrder + create-payment fetch)
- Browsers strip the "user gesture" context after awaits, silently blocking popups — this is why the iKhokha payment tab never appeared
- Rewrote handleIkhokha():
  * Opens a BLANK tab synchronously at the START of the click handler (preserves user gesture)
  * Writes a branded loading placeholder ("Preparing your secure payment page…") into the blank tab
  * Then runs the async work (saveOrder, create-payment fetch)
  * On success: redirects the pre-opened popup to the payment URL via popup.location.href
  * On failure: closes the popup and shows a toast
  * If popup was blocked entirely (popup === null): shows toast telling user to tap 'Re-open Payment Page' button below
  * Removed duplicate saveOrder() call in the catch block (was redundant and could create a 2nd order)
- Build was failing due to stale /api/shipping/create/route.ts importing from deleted src/lib/courier-guy.ts
- Removed stale routes and files:
  * /api/shipping/create, /api/shipping/create-shipment, /api/shipping/rates, /api/shipping/track (Courier Guy remnants)
  * /api/places/autocomplete, /api/places/details (Geoapify remnants)
  * /api/yoco (unused alt payment gateway)
  * src/lib/courier-guy.ts (orphaned)
  * src/components/AddressAutocomplete.tsx (orphaned — page.tsx has the address input inlined)
- Build verified clean — all routes registered correctly:
  * /api/admin/auth, /api/admin/orders
  * /api/email/order-confirmation (preserved)
  * /api/ikhokha/create-payment, /api/ikhokha/webhook
  * /api/orders, /api/orders/status
  * /api/settings
- Verified create-payment endpoint returns {success: false, noApi: true} correctly when no iKhokha credentials are set
- Frontend correctly falls back to static URL: https://pay.ikhokha.com/biltongandbytes/mpr/online?amount=X.XX
- With the popup fix, this static URL will now actually OPEN in a new tab when the customer taps "PAY WITH IKHOKHA"

Stage Summary:
- iKhokha payment link will now open reliably (popup blocker defeated)
- Build no longer broken by stale Courier Guy code
- 1 file changed, 70 insertions, 38 deletions
- Committed locally (e4e88de)
- PUSH FAILED: cached GitHub token expired — user needs to update remote URL with a new PAT, OR I need to use a different auth method
- ACTION REQUIRED: User must push manually or provide a new GitHub PAT

---
Task ID: 5
Agent: Main Agent
Task: Fix stuck checkout — both iKhokha and Cash buttons not working

Work Log:
- User reported both iKhokha and Cash buttons "don't work" on checkout
- Checked git log: prior fixes (commits 14a7e58, 6379ff2, e4e88de) addressed popup-blocker / plain <a> tag / PATCH payment_status — all already pushed
- Tested production API directly with curl:
  * POST https://biltongandbytes.co.za/api/orders → 500 "Internal server error"
  * POST https://biltongandbytes.co.za/api/ikhokha/create-payment → 200 success (real paylink URL returned — iKhokha integration works)
- Root cause hunt: tested Supabase project reachability
  * nslookup fltjcycovhslqupmalfj.supabase.co on Cloudflare (1.1.1.1), Google (8.8.8.8, 8.8.4.4), Quad9 (9.9.9.9) → ALL return NXDOMAIN
  * Conclusion: Supabase project has been deleted (or DNS records removed)
- Why this broke checkout: saveOrder() calls POST /api/orders. The route's outer catch returned 500 on fetch failure → saveOrder() returned null → handleIkhokha and handleCashOnCollection both aborted silently. Buttons appeared dead.
- Fix applied (graceful degradation):
  * src/app/api/orders/route.ts POST: wraps Supabase fetch in its own try/catch with 8s AbortSignal timeout. On failure returns {success:true, data:orderData, degraded:true} so the customer can still proceed to payment. The merchant still gets email notification (Resend doesn't depend on Supabase).
  * src/app/api/orders/route.ts PATCH: same pattern. Returns {success:true, degraded:true} on Supabase failure. This unblocks the manual "I've Paid — Confirm Order" button and the iKhokha webhook callback.
  * src/app/api/orders/status/route.ts GET: returns {found:true, degraded:true, payment_status:"pending"} on Supabase failure. This keeps the polling loop alive — after 15 min the customer sees the "I've Paid — Confirm Order" fallback UI.
  * All 3 endpoints now also include the actual error message in dev logs and 500 responses for easier future debugging.
  * getLivePrices() now also returns a supabaseReachable flag and uses a 5s AbortSignal timeout.
- Build verified clean (npx next build, 13 routes generated)
- Committed + pushed to GitHub (6793d02) — Vercel auto-deploy triggered
- Verified fix is LIVE on production:
  * POST /api/orders → 200 {success:true, degraded:true}
  * PATCH /api/orders → 200 {success:true, degraded:true}
  * GET /api/orders/status?order_id=BB260708-TEST1 → 200 {found:true, degraded:true, payment_status:"pending"}

Stage Summary:
- Checkout is now UNBLOCKED — both iKhokha and Cash buttons will work
- Customer journey in degraded mode:
  1. Click "PAY WITH IKHOKHA" → order saved (degraded) → "OPEN PAYMENT PAGE" button appears
  2. Click "OPEN PAYMENT PAGE" → goes to iKhokha secure payment (real iKhokha API works)
  3. After paying, polling can't auto-confirm (webhook can't update Supabase)
  4. After 15 min OR immediately if customer taps "I'VE PAID — CONFIRM ORDER" → order is marked paid locally, customer sees "Payment Approved!"
  5. Merchant receives order email via Resend (works independently of Supabase)
- KNOWN LIMITATION: admin panel won't show new orders until Supabase is restored
- ACTION REQUIRED for full fix:
  * User must recreate the Supabase project (or unpause if just paused)
  * Run schema migrations (orders + settings tables)
  * If a new project URL is needed, update SUPABASE_URL + SUPABASE_ANON_KEY in:
    - src/app/api/orders/route.ts
    - src/app/api/orders/status/route.ts
    - src/app/api/ikhokha/webhook/route.ts
    - src/app/api/admin/orders/route.ts
- Files changed: 2, +186 lines, -114 lines

---
Task ID: 6
Agent: Main Agent
Task: Add product management (CRUD) + dynamic pricing to admin panel

Work Log:
- Created SQL migration: supabase/migration-products-table.sql (products table with RLS + seed of 4 existing products)
- Updated supabase/schema.sql to include products table for fresh installs
- Created src/app/api/products/route.ts: GET (public, supports ?include_inactive=1 for admin) + POST (admin auth, creates product)
- Created src/app/api/products/[id]/route.ts: PATCH (admin auth, updates product) + DELETE (admin auth, deletes product)
- Updated src/app/api/orders/route.ts getLivePrices(): now fetches prices from products table (keyed by name) instead of settings.product_prices JSON. Falls back to legacy settings.product_prices if products table unreachable.
- Updated src/lib/supabase.ts: added Product interface, kept PRODUCTS array as fallback only (now properly typed)
- Updated src/app/page.tsx storefront:
  * Added Product type import
  * ProductsSection now fetches live products from /api/products on mount, falls back to hardcoded PRODUCTS if fetch fails
  * Shows skeleton placeholders while loading
  * ProductCard now reads badge from product.badge field (was hardcoded by product.id)
  * ProductCard price now comes directly from the API (was using settings store getPrice helper)
  * Added support for custom badges (any text besides "Popular"/"Best Value")
- Updated src/app/admin/page.tsx:
  * Added "products" to DashboardTab type
  * Added Products tab button between Orders and Settings
  * Created ProductsPanel component: lists all products (active + inactive) with image/name/weight/price/badge/visibility, plus ADD PRODUCT button, edit/hide/delete actions per row
  * Created ProductEditor modal: full form with name, weight, grams, price, sort_order, description, image URL (with live preview), badge selector (None/Popular/Best Value), visibility toggle
  * Updated SettingsPanel: removed per-product price inputs (now in Products tab), kept delivery fees only, added note pointing users to Products tab
  * Updated /api/products GET to accept ?include_inactive=1 query param for admin
- Build verified clean (npx next build, 14 routes registered including /api/products and /api/products/[id])
- Committed + pushed to GitHub

Stage Summary:
- Admin panel now has 3 tabs: Orders, Products, Settings
- Products tab supports full CRUD: add new products, edit any field, hide/show (soft toggle), delete (hard)
- Storefront fetches products dynamically — new products appear immediately without code changes
- Prices verified server-side from products table on order submission (prevents tampering)
- Existing 4 products preserved (seeded via SQL migration)
- Image = URL input (paste from anywhere). Future enhancement: file upload to Supabase Storage.
- Flavors stay global (hardcoded Traditional/Chilli/Hot Honey Glazed). Future enhancement: per-product flavors.
- ACTION REQUIRED: User must run supabase/migration-products-table.sql in Supabase SQL Editor to create the products table
- Files changed: 7 modified + 3 new, ~700 lines added

---
Task ID: 7
Agent: Main Agent
Task: Add deals/bundles section to storefront + admin panel management (mix & match deals)

Work Log:
- Explored codebase: products table pattern (src/app/api/products), settings JSONB pattern, admin panel tab structure (Orders/Products/Settings), storefront ProductsSection component, orders API price verification flow
- Verified user's deal math against live production prices (Taster R49, Snack R129, Family R349, Feast R649):
  * 3 × Taster (3×49=147) → R139 = save R8 ✓
  * 2 × Snack (2×129=258) → R249 = save R9 ✓
  * Family + 2 Taster (349+2×49=447) → R439 = save R8 ✓
  * 2 × Feast (2×649=1298) → R1250 = save R48 ✓
- Created supabase/migration-deals-table.sql: deals table (SERIAL id, name, description, items JSONB, price, original_price, savings, img, badge, is_active, sort_order) with RLS policies + seed of 4 starter deals
- Updated supabase/schema.sql to include deals table for fresh installs
- Created src/app/api/deals/route.ts: GET (public, ?include_inactive=1 for admin) + POST (admin auth, auto-computes original_price + savings from live product prices). GET returns empty array if deals table doesn't exist yet (graceful degradation).
- Created src/app/api/deals/[id]/route.ts: PATCH (admin auth, recomputes prices if items change) + DELETE (admin auth). Fixed import path bug (../../admin/auth/route for [id] subdirectory, not ../admin/auth/route) and next.server typo (should be next/server).
- Updated src/app/api/orders/route.ts: getLivePrices() now fetches deal prices in parallel with product prices + settings. Added DEFAULT_DEAL_PRICES fallback (matches hardcoded DEALS in supabase.ts) so customers can order deals even before the migration is run. Verification loop: if item.flavor === "Bundle", match against deals table by exact name; else match against products table by name/prefix (existing logic).
- Updated src/lib/supabase.ts: added Deal + DealItem interfaces, added DEALS fallback array with 4 starter deals (prices match the seed SQL).
- Updated src/app/page.tsx:
  * Added DEALS + Deal type imports
  * Added "Bundle" case to FlavorIcon (Package icon for deal items in cart)
  * Created DealCard component: savings badge, image, name, description, items list (product chips), price with strikethrough original, qty selector, add-to-cart button
  * Created DealsSection component: fetches /api/deals, falls back to hardcoded DEALS, renders 4-up grid with skeleton loaders
  * Inserted <DealsSection /> between ProductsSection and StorySection
  * Added "DEALS" link to Navbar (with Zap icon)
- Updated src/app/admin/page.tsx:
  * Added Deal + DealItem type imports, added Zap icon import
  * Changed DashboardTab type to include "deals"
  * Created DealsPanel component: lists all deals (active + inactive) with image/name/items/price/savings/visibility, ADD DEAL button, edit/hide/delete actions per row
  * Created DealEditor modal: name, description, items builder (product picker dropdown + quantity + remove), price/original/savings triple input with auto-compute, "Recompute prices" button, image URL with preview, badge, sort order, visibility toggle
  * Added Deals tab button between Products and Settings
  * Wired DealsPanel rendering into the tab switch
- Build verified clean (npx next build, 15 routes including /api/deals + /api/deals/[id])
- Committed (0e72312) + pushed to GitHub — Vercel auto-deploy triggered
- Verified production: GET /api/deals returns {deals:[]} (table doesn't exist yet, graceful fallback)
- Verified price verification: POST /api/orders with tampered prices (price=1) for a deal item → server corrected to R139 (DEFAULT_DEAL_PRICES fallback) + product item corrected to R129 (products table). Subtotal R268. Order saved to Supabase successfully.

Stage Summary:
- Storefront has a new "Mix & Match Deals" section showing 4 starter deals (using hardcoded fallback until migration is run)
- Admin panel has a new Deals tab with full CRUD: add/edit/hide/delete deals, product picker, auto-compute savings
- Deals are added to cart as single line items (flavor="Bundle") with the Package icon
- Server-side price verification prevents tampering: deal prices verified against deals table (or DEFAULT_DEAL_PRICES fallback), product prices verified against products table
- ACTION REQUIRED: User must run supabase/migration-deals-table.sql in Supabase SQL Editor to create the deals table. Until then:
  * Storefront shows hardcoded fallback deals (4 starter deals)
  * Admin panel shows "No deals yet" (admin can't create/edit deals)
  * Customers CAN order deals (orders API uses DEFAULT_DEAL_PRICES fallback)
- Test order BB-DEAL-TEST-001 is in the admin panel — user can delete it
- Files: 9 changed, +1658 lines, -30 lines
