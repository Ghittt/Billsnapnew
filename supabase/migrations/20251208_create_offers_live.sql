-- Create offers_live table for real-time scraped offers
CREATE TABLE IF NOT EXISTS public.offers_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornitore TEXT NOT NULL,
  nome_offerta TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('luce', 'gas', 'dual')),
  tipo_prezzo TEXT CHECK (tipo_prezzo IN ('fisso', 'variabile')),
  prezzo_energia_euro_kwh NUMERIC(10,6),
  prezzo_energia_euro_smc NUMERIC(10,6),
  quota_fissa_mensile_euro NUMERIC(10,2),
  promozione_attiva BOOLEAN DEFAULT false,
  sconto_promozione TEXT,
  url_offerta TEXT,
  data_scadenza DATE,
  fonte TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers_live ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view offers_live" ON public.offers_live;
CREATE POLICY "Anyone can view offers_live"
ON public.offers_live
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can manage offers_live" ON public.offers_live;
CREATE POLICY "Service role can manage offers_live"
ON public.offers_live
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_live_fornitore ON public.offers_live(fornitore);
CREATE INDEX IF NOT EXISTS idx_offers_live_tipo ON public.offers_live(tipo);
CREATE INDEX IF NOT EXISTS idx_offers_live_scraped ON public.offers_live(scraped_at);
