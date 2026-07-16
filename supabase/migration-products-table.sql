-- ======================================================================
-- MIGRATION: Add products table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ======================================================================
-- Moves product definitions out of hardcoded src/lib/supabase.ts into a
-- dynamic table that the admin panel can CRUD. Prices also move here
-- (previously stored in settings.product_prices JSON).
-- Existing 4 products are seeded with their current values.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1) PRODUCTS TABLE
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

-- Index for fast active-product queries ordered by sort_order
CREATE INDEX IF NOT EXISTS products_active_sort_idx
  ON public.products (is_active, sort_order);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read (storefront needs to display products)
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
CREATE POLICY "Products are publicly readable" ON public.products
  FOR SELECT USING (true);

-- Public write (admin panel uses anon key; auth enforced at Next.js API layer)
DROP POLICY IF EXISTS "Products are publicly insertable" ON public.products;
CREATE POLICY "Products are publicly insertable" ON public.products
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products are publicly updatable" ON public.products;
CREATE POLICY "Products are publicly updatable" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Products are publicly deletable" ON public.products;
CREATE POLICY "Products are publicly deletable" ON public.products
  FOR DELETE USING (true);

-- ----------------------------------------------------------------------
-- 2) SEED EXISTING 4 PRODUCTS
--    (id values 0-3 are preserved as sort_order so existing cart
--     price-id mapping continues to work; new products get sort_order >= 4)
-- ----------------------------------------------------------------------
INSERT INTO public.products (name, weight, grams, price, description, img, badge, is_active, sort_order)
VALUES
  ('The Taster',    '50g',  50,   35, 'Perfect bite-sized sample of our premium wet biltong',    '/images/taster-50g.webp',       NULL,          TRUE, 0),
  ('Snack Pack',    '150g', 150,  100, 'Ideal for snacking — great for on-the-go cravings',     '/images/snack-pack-150g.jpeg',  NULL,          TRUE, 1),
  ('Family Batch',  '500g', 500,  300, 'Share with the family — the crowd favourite size',      '/images/family-batch-500g.webp','Popular',     TRUE, 2),
  ('The Feast',     '1kg',  1000, 550, 'The ultimate biltong experience — best value per gram', '/images/feast-1kg.jpeg',        'Best Value',  TRUE, 3)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------
-- 3) VERIFY
-- ----------------------------------------------------------------------
SELECT id, name, weight, price, badge, is_active, sort_order
FROM public.products
ORDER BY sort_order;
