-- Settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Single-row table
  delivery_fee INTEGER NOT NULL DEFAULT 40,  -- in Rand
  product_prices JSONB NOT NULL DEFAULT '{
    "0": 35,
    "1": 100,
    "2": 300,
    "3": 550
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (needed for storefront)
CREATE POLICY "Settings are publicly readable" ON public.settings
  FOR SELECT USING (true);

-- Allow anon to update settings (admin panel uses anon key with password auth)
CREATE POLICY "Authenticated users can update settings" ON public.settings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow insert for initial setup
CREATE POLICY "Allow insert on settings" ON public.settings
  FOR INSERT WITH CHECK (true);

-- Seed the single row
INSERT INTO public.settings (id, delivery_fee, product_prices)
VALUES (1, 40, '{"0": 35, "1": 100, "2": 300, "3": 550}'::jsonb)
ON CONFLICT (id) DO NOTHING;
