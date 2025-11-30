-- Create offers_scraped table if it doesn't exist

CREATE TABLE IF NOT EXISTS public.offers_scraped (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('luce', 'gas', 'dual')),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fisso', 'variabile', 'indicizzato')),
  price_kwh DECIMAL,
  price_f1 DECIMAL,
  price_f2 DECIMAL,
  price_f3 DECIMAL,
  unit_price_eur_smc DECIMAL,
  fixed_fee_eur_mo DECIMAL NOT NULL DEFAULT 0,
  power_fee_year DECIMAL DEFAULT 0,
  is_green BOOLEAN DEFAULT false,
  scraped_url TEXT,
  raw_data JSONB,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.offers_scraped ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
DROP POLICY IF EXISTS "Service role can manage offers" ON public.offers_scraped;
CREATE POLICY "Service role can manage offers" 
ON public.offers_scraped 
FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view scraped offers" ON public.offers_scraped;
CREATE POLICY "Anyone can view scraped offers" 
ON public.offers_scraped 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_offers_scraped_updated_at ON public.offers_scraped;
CREATE TRIGGER update_offers_scraped_updated_at
  BEFORE UPDATE ON public.offers_scraped
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
