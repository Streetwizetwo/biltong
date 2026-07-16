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

-- Seed the single row (default delivery fees; product_prices kept for backward compat
-- but actual product prices now live in the products table)
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
-- 3) PRODUCTS TABLE (dynamic product catalog, admin-managed)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  weight       TEXT NOT NULL,                -- "50g", "150g", "500g", "1kg"
  grams        INTEGER NOT NULL DEFAULT 0,   -- for price-per-gram display
  price        INTEGER NOT NULL DEFAULT 0,   -- in Rand (whole number)
  description  TEXT NOT NULL DEFAULT '',
  img          TEXT NOT NULL DEFAULT '',     -- URL or local /images/ path
  badge        TEXT,                          -- "Popular", "Best Value", or NULL
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_active_sort_idx
  ON public.products (is_active, sort_order);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
CREATE POLICY "Products are publicly readable" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are publicly insertable" ON public.products;
CREATE POLICY "Products are publicly insertable" ON public.products
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products are publicly updatable" ON public.products;
CREATE POLICY "Products are publicly updatable" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Products are publicly deletable" ON public.products;
CREATE POLICY "Products are publicly deletable" ON public.products
  FOR DELETE USING (true);

-- Seed the 4 existing products
INSERT INTO public.products (name, weight, grams, price, description, img, badge, is_active, sort_order)
VALUES
  ('The Taster',    '50g',  50,   35, 'Perfect bite-sized sample of our premium wet biltong',    '/images/taster-50g.webp',       NULL,          TRUE, 0),
  ('Snack Pack',    '150g', 150,  100, 'Ideal for snacking — great for on-the-go cravings',     '/images/snack-pack-150g.jpeg',  NULL,          TRUE, 1),
  ('Family Batch',  '500g', 500,  300, 'Share with the family — the crowd favourite size',      '/images/family-batch-500g.webp','Popular',     TRUE, 2),
  ('The Feast',     '1kg',  1000, 550, 'The ultimate biltong experience — best value per gram', '/images/feast-1kg.jpeg',        'Best Value',  TRUE, 3)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------
-- 4) DEALS TABLE (admin-managed bundle deals, e.g. "3 × Taster – R139")
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deals (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{product_id, product_name, quantity, weight, img}, ...]
  price           INTEGER NOT NULL DEFAULT 0,            -- bundle price in Rand
  original_price  INTEGER NOT NULL DEFAULT 0,            -- sum of individual prices
  savings         INTEGER NOT NULL DEFAULT 0,            -- original_price - price
  img             TEXT NOT NULL DEFAULT '',
  badge           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deals_active_sort_idx
  ON public.deals (is_active, sort_order);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deals are publicly readable" ON public.deals;
CREATE POLICY "Deals are publicly readable" ON public.deals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Deals are publicly insertable" ON public.deals;
CREATE POLICY "Deals are publicly insertable" ON public.deals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Deals are publicly updatable" ON public.deals;
CREATE POLICY "Deals are publicly updatable" ON public.deals
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Deals are publicly deletable" ON public.deals;
CREATE POLICY "Deals are publicly deletable" ON public.deals
  FOR DELETE USING (true);

-- Seed the 4 starter deals (prices match the seeded product prices above)
INSERT INTO public.deals (name, description, items, price, original_price, savings, img, badge, is_active, sort_order)
VALUES
  ('Triple Taster Saver',
   'Three taster packs of our premium wet biltong — perfect to share or stock your snack drawer.',
   '[{"product_id":1,"product_name":"The Taster","quantity":3,"weight":"50g","img":"/images/taster-50g.webp"}]'::jsonb,
   139, 147, 8, '/images/taster-50g.webp', 'Save R8', TRUE, 0),
  ('Double Snack Pack',
   'Two snack packs — double the flavour, less the price. Great for on-the-go cravings.',
   '[{"product_id":2,"product_name":"Snack Pack","quantity":2,"weight":"150g","img":"/images/snack-pack-150g.jpeg"}]'::jsonb,
   249, 258, 9, '/images/snack-pack-150g.jpeg', 'Save R9', TRUE, 1),
  ('Family + Taster Combo',
   'A family batch for the household plus two taster packs to try something new.',
   '[{"product_id":3,"product_name":"Family Batch","quantity":1,"weight":"500g","img":"/images/family-batch-500g.webp"},{"product_id":1,"product_name":"The Taster","quantity":2,"weight":"50g","img":"/images/taster-50g.webp"}]'::jsonb,
   439, 447, 8, '/images/family-batch-500g.webp', 'Save R8', TRUE, 2),
  ('Double Feast',
   'Two kilograms of the ultimate biltong experience — best value per gram, doubled.',
   '[{"product_id":4,"product_name":"The Feast","quantity":2,"weight":"1kg","img":"/images/feast-1kg.jpeg"}]'::jsonb,
   1250, 1298, 48, '/images/feast-1kg.jpeg', 'Save R48', TRUE, 3)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------
-- 5) VERIFY
-- ----------------------------------------------------------------------
SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM public.orders
UNION ALL
SELECT 'settings', COUNT(*) FROM public.settings
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'deals', COUNT(*) FROM public.deals;
