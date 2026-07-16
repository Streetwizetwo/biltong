-- ======================================================================
-- BILTONG & BYTES — Deals / Bundles table migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ======================================================================
-- Creates a `deals` table that lets the admin build bundle deals
-- (e.g. "3 × Taster Packs – R139, save R8") from the existing products.
-- Deals are stored independently of products — deleting a product does
-- not delete the deal, but the deal will fail price-verification at
-- checkout until the admin updates it.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1) DEALS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deals (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,                           -- "Triple Taster Saver"
  description     TEXT NOT NULL DEFAULT '',                -- short marketing line
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{product_id, product_name, quantity, weight, img}, ...]
  price           INTEGER NOT NULL DEFAULT 0,              -- bundle price in Rand
  original_price  INTEGER NOT NULL DEFAULT 0,              -- sum of individual prices (for savings display)
  savings         INTEGER NOT NULL DEFAULT 0,              -- original_price - price (precomputed for easy display)
  img             TEXT NOT NULL DEFAULT '',                -- image URL
  badge           TEXT,                                     -- "Save R8", "Best Deal", or NULL
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

-- ----------------------------------------------------------------------
-- 2) SEED THE 4 STARTER DEALS
-- ----------------------------------------------------------------------
-- Prices below match the live product prices at time of writing:
--   The Taster (50g)  = R49
--   Snack Pack (150g) = R129
--   Family Batch      = R349
--   The Feast (1kg)   = R649
--
-- Deals:
--   1) 3 × Taster Packs            – R139  (save R8)   [3 × 49 = 147]
--   2) 2 × Snack Packs             – R249  (save R9)   [2 × 129 = 258]
--   3) Family Batch + 2 × Taster   – R439  (save R8)   [349 + 2 × 49 = 447]
--   4) 2 × 1kg Feast Packs         – R1250 (save R48)  [2 × 649 = 1298]
--
-- NOTE: product_id values reference the products table. If your products
-- table has different IDs, adjust the product_id values below before running.
-- The product_name / weight / img fields are denormalized so the storefront
-- can render deal cards without joining — update them if you rename products.
-- ----------------------------------------------------------------------

INSERT INTO public.deals (name, description, items, price, original_price, savings, img, badge, is_active, sort_order)
VALUES
  (
    'Triple Taster Saver',
    'Three taster packs of our premium wet biltong — perfect to share or stock your snack drawer.',
    '[{"product_id":1,"product_name":"The Taster","quantity":3,"weight":"50g","img":"/images/taster-50g.webp"}]'::jsonb,
    139, 147, 8,
    '/images/taster-50g.webp',
    'Save R8',
    TRUE, 0
  ),
  (
    'Double Snack Pack',
    'Two snack packs — double the flavour, less the price. Great for on-the-go cravings.',
    '[{"product_id":2,"product_name":"Snack Pack","quantity":2,"weight":"150g","img":"/images/snack-pack-150g.jpeg"}]'::jsonb,
    249, 258, 9,
    '/images/snack-pack-150g.jpeg',
    'Save R9',
    TRUE, 1
  ),
  (
    'Family + Taster Combo',
    'A family batch for the household plus two taster packs to try something new.',
    '[{"product_id":3,"product_name":"Family Batch","quantity":1,"weight":"500g","img":"/images/family-batch-500g.webp"},{"product_id":1,"product_name":"The Taster","quantity":2,"weight":"50g","img":"/images/taster-50g.webp"}]'::jsonb,
    439, 447, 8,
    '/images/family-batch-500g.webp',
    'Save R8',
    TRUE, 2
  ),
  (
    'Double Feast',
    'Two kilograms of the ultimate biltong experience — best value per gram, doubled.',
    '[{"product_id":4,"product_name":"The Feast","quantity":2,"weight":"1kg","img":"/images/feast-1kg.jpeg"}]'::jsonb,
    1250, 1298, 48,
    '/images/feast-1kg.jpeg',
    'Save R48',
    TRUE, 3
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------
-- 3) VERIFY
-- ----------------------------------------------------------------------
SELECT 'deals' AS table_name, COUNT(*) AS row_count FROM public.deals;
