# Biltong & Bytes - Work Log

---
Task ID: 1
Agent: Main Agent
Task: Initialize fullstack development environment

Work Log:
- Ran init-fullstack script to set up Next.js 16 project
- Verified project structure at /home/z/my-project
- Confirmed package.json has all needed dependencies (framer-motion, zustand, sonner, etc.)

Stage Summary:
- Next.js 16 project initialized and running on port 3000
- All dependencies available: framer-motion, zustand, shadcn/ui, lucide-react, sonner

---
Task ID: 2
Agent: Main Agent
Task: Plan mobile UX improvements and architecture

Work Log:
- Analyzed original HTML site for features to preserve
- Designed mobile-first architecture with Zustand state management
- Planned bottom-sheet cart drawer, spring animations, parallax hero
- Identified key improvements: touch targets, swipe interactions, loading states

Stage Summary:
- Architecture: Zustand store (persisted), API routes for Supabase, Framer Motion animations
- Key mobile UX: bottom-sheet cart/checkout, parallax hero, haptic-like tap feedback, address autocomplete

---
Task ID: 3
Agent: Main Agent
Task: Build complete Next.js app with mobile-first design

Work Log:
- Created /src/lib/store.ts - Zustand cart store with persistence
- Created /src/lib/supabase.ts - Order logic, WhatsApp message builder, product data
- Created /src/app/api/orders/route.ts - Server-side Supabase API route
- Created /src/app/page.tsx - Complete single-page app with all components
- Updated /src/app/layout.tsx - Custom fonts, metadata
- Updated /src/app/globals.css - Dark theme, custom scrollbar, mobile optimizations
- Fixed ESLint issues: setState-in-effect, refs-in-render patterns

Stage Summary:
- Full app built with: Hero (parallax), PhotoStrip, Products (flavor selectors, quantity, add-to-cart), Story, How-to-Order, Contact sections
- Cart Drawer: bottom-sheet style, delivery mode toggle, address autocomplete, animated items
- Checkout Modal: iKhokha payment flow, WhatsApp ordering, order ID generation, Supabase save
- Floating cart button with badge animation
- Smoke canvas background effect
- All animations powered by Framer Motion

---
Task ID: 4
Agent: Main Agent
Task: Supabase integration, iKhokha payment, WhatsApp ordering

Work Log:
- API route at /api/orders handles POST (save) and PATCH (update status)
- Supabase credentials kept server-side via API route
- iKhokha payment opens in new tab, then user confirms on WhatsApp
- WhatsApp messages formatted with order details, payment method, delivery info
- localStorage backup for offline resilience

Stage Summary:
- Orders saved to Supabase via server-side API (no exposed keys on client)
- iKhokha integration: opens payment link, then WhatsApp confirmation
- WhatsApp Cash/Card flow: direct message via WhatsApp
- Order status tracking: new → payment_initiated → paid → confirmed

---
Task ID: 5
Agent: Main Agent
Task: The Courier Guy (Shiplogic) API integration with dual delivery model

Work Log:
- Created .env.local with COURIER_GUY_API_KEY
- Updated next.config.ts CSP to allow api.portal.thecourierguy.co.za
- Created /src/lib/courier-guy.ts — full API library (rate checking, shipment creation, tracking, label, address parsing, Stanger detection)
- Created /src/app/api/shipping/rates/route.ts — API route that returns R40 flat fee for Stanger addresses or live Courier Guy rates for non-Stanger
- Created /src/app/api/shipping/create-shipment/route.ts — API route for creating shipments after payment
- Created /src/app/api/shipping/track/route.ts — API route for shipment tracking by reference
- Removed old /src/app/api/shipping/create/route.ts (stale file with wrong imports)
- Updated /src/lib/supabase.ts — Added tracking_reference and shipping_carrier fields to OrderData, added SA_CITIES array for national delivery suggestions, updated WhatsApp message builder to include tracking info
- Updated /src/lib/store.ts — Already had ShippingRate interface, isStangerDelivery, availableRates, selectedRate, ratesLoading, and deliveryFee() dual model (was already built in previous session)
- Updated /src/app/page.tsx — Added createShipment callback, tracking state, auto-creates Courier Guy shipment on checkout for non-Stanger orders, updated OrderSuccess to show tracking reference, updated address suggestions to include SA cities, added Courier Guy note in checkout
- Updated /src/app/api/orders/route.ts — Updated delivery fee verification for Stanger vs non-Stanger, added shipping_carrier and tracking_reference fields to Supabase insert, updated PATCH endpoint to support updating tracking info
- Build succeeds ✓

Stage Summary:
- Dual delivery model: R40 flat fee for Stanger, live Courier Guy rates for rest of SA
- 3 API routes: /api/shipping/rates, /api/shipping/create-shipment, /api/shipping/track
- Shipment auto-created after successful payment for non-Stanger deliveries
- Tracking reference shown on order success screen and in WhatsApp messages
- Address autocomplete now includes major SA cities
- ⚠️ User needs to add `tracking_reference` and `shipping_carrier` columns to Supabase orders table
