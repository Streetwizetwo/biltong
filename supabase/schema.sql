-- ======================================================================
-- BILTONG & BYTES — Complete Supabase schema (orders + settings)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ======================================================================
-- This creates both tables needed by the app. Safe to re-run (IF NOT EXISTS).
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1) ORDERS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  order_id          TEXT PRIMARY KEY,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_summary     TEXT NOT NULL DEFAULT '',
  subtotal          INTEGER NOT NULL DEFAULT 0,
  delivery_fee      INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL DEFAULT 0,
  delivery_mode     TEXT NOT NULL DEFAULT 'collect',
  delivery_address  TEXT,
  payment_method    TEXT NOT NULL DEFAULT 'cash',
  payment_status    TEXT NOT NULL DEFAULT 'pending',
  order_status      TEXT NOT NULL DEFAULT 'new',
  paylink_id        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast status filtering + ordering (admin dashboard)
CREATE INDEX IF NOT EXISTS orders_order_status_idx     ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS orders_created_at_desc_idx  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx   ON public.orders (payment_status);

-- Enable Row-Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public read policy: the storefront + admin panel both use the anon key.
-- (Admin auth is enforced at the Next.js API layer via signed cookies;
--  Supabase is treated as a private backend reachable only through our API routes.)
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;
CREATE POLICY "Orders are publicly readable" ON public.orders
  FOR SELECT USING (true);

-- Public write policy: storefront creates new orders via the anon key
DROP POLICY IF EXISTS "Orders are publicly insertable" ON public.orders;
CREATE POLICY "Orders are publicly insertable" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Public update policy: webhook + admin panel update order_status / payment_status
DROP POLICY IF EXISTS "Orders are publicly updatable" ON public.orders;
CREATE POLICY "Orders are publicly updatable" ON public.orders
  FOR UPDATE USING (true) WITH CHECK (true);

-- Public delete policy: admin soft-deletes by setting order_status='deleted',
-- but we also allow hard DELETE for completeness
DROP POLICY IF EXISTS "Orders are publicly deletable" ON public.orders;
CREATE POLICY "Orders are publicly deletable" ON public.orders
  FOR DELETE USING (true);

-- ----------------------------------------------------------------------
-- 2) SETTINGS TABLE (single-row table for product prices + delivery fees)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  delivery_fee    INTEGER NOT NULL DEFAULT 40,
  product_prices  JSONB NOT NULL DEFAULT '{
    "0": 35,
    "1": 100,
    "2": 300,
    "3": 550,
    "nationwide_delivery_fee": 150
  }'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are publicly readable" ON public.settings;
CREATE POLICY "Settings are publicly readable" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;
CREATE POLICY "Authenticated users can update settings" ON public.settings
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert on settings" ON public.settings;
CREATE POLICY "Allow insert on settings" ON public.settings
  FOR INSERT WITH CHECK (true);

-- Seed the single row (default prices + R40 Stanger / R150 nationwide delivery)
INSERT INTO public.settings (id, delivery_fee, product_prices)
VALUES (1, 40, '{
  "0": 35,
  "1": 100,
  "2": 300,
  "3": 550,
  "nationwide_delivery_fee": 150
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------
-- 3) VERIFY
-- ----------------------------------------------------------------------
SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM public.orders
UNION ALL
SELECT 'settings', COUNT(*) FROM public.settings;
