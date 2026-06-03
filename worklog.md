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
