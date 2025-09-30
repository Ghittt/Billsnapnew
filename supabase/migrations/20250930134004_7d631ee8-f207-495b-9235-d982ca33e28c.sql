-- Add structured fields to ocr_results table
ALTER TABLE public.ocr_results 
ADD COLUMN IF NOT EXISTS pod text,
ADD COLUMN IF NOT EXISTS pdr text,
ADD COLUMN IF NOT EXISTS f1_kwh numeric,
ADD COLUMN IF NOT EXISTS f2_kwh numeric,
ADD COLUMN IF NOT EXISTS f3_kwh numeric,
ADD COLUMN IF NOT EXISTS potenza_kw numeric,
ADD COLUMN IF NOT EXISTS tariff_hint text,
ADD COLUMN IF NOT EXISTS billing_period_start date,
ADD COLUMN IF NOT EXISTS billing_period_end date,
ADD COLUMN IF NOT EXISTS provider text;

-- Add tariff structure to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS tariff_type text DEFAULT 'monoraria',
ADD COLUMN IF NOT EXISTS price_f1 numeric,
ADD COLUMN IF NOT EXISTS price_f2 numeric,
ADD COLUMN IF NOT EXISTS price_f3 numeric,
ADD COLUMN IF NOT EXISTS price_f23 numeric,
ADD COLUMN IF NOT EXISTS power_fee_year numeric DEFAULT 0;

-- Rename existing price column for clarity
ALTER TABLE public.offers 
RENAME COLUMN unit_price_eur_kwh TO price_kwh;

-- Create comparison_results table
CREATE TABLE IF NOT EXISTS public.comparison_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads(id),
  user_id uuid,
  profile_json jsonb NOT NULL,
  ranked_offers jsonb NOT NULL,
  best_offer_id uuid,
  ai_explanation jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comparison results"
ON public.comparison_results FOR SELECT
USING (true);

CREATE POLICY "System can insert comparison results"
ON public.comparison_results FOR INSERT
WITH CHECK (true);