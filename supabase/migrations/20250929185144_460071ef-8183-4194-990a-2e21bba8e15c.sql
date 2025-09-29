-- Add green/eco-friendly flag to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS is_green BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.offers.is_green IS 'Indicates if the offer uses renewable/green energy';

-- Insert sample verified offers for testing (using correct pricing_type values)
INSERT INTO public.offers (provider, plan_name, unit_price_eur_kwh, fixed_fee_eur_mo, commodity, pricing_type, is_green, redirect_url, terms_url, is_active, area)
VALUES
  ('A2A Energia', 'Energia Fissa 12', 0.22, 8.99, 'power', 'fixed', true, 'https://www.a2aenergia.eu/luce', 'https://www.a2aenergia.eu/termini', true, 'IT-NORD'),
  ('Edison Energia', 'Edison Click Luce', 0.21, 6.90, 'power', 'fixed', false, 'https://www.edisonenergia.it/offerte/luce', 'https://www.edisonenergia.it/termini', true, 'IT-CENTRO'),
  ('Sorgenia', 'Next Energy Luce', 0.215, 7.50, 'power', 'indexed', true, 'https://www.sorgenia.it/offerte-luce', 'https://www.sorgenia.it/termini', true, 'IT-NAZIONALE'),
  ('Acea Energia', 'Acea Rapida Luce', 0.225, 6.99, 'power', 'fixed', false, 'https://www.aceaenergia.it/offerte/luce', 'https://www.aceaenergia.it/termini', true, 'IT-CENTRO'),
  ('Illumia', 'Luce Verde', 0.218, 7.20, 'power', 'fixed', true, 'https://www.illumia.it/luce', 'https://www.illumia.it/termini', true, 'IT-NAZIONALE')
ON CONFLICT (id) DO NOTHING;