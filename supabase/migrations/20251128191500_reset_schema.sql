-- RESET MIGRATION: Drops and recreates uploads, ocr_results, ocr_debug
-- WARNING: This deletes all data in these tables.

BEGIN;

-- 1. Drop existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS public.ocr_debug CASCADE;
DROP TABLE IF EXISTS public.ocr_error_logs CASCADE; -- Drop potential alias
DROP TABLE IF EXISTS public.ocr_results CASCADE;
DROP TABLE IF EXISTS public.uploads CASCADE;

-- 2. Create 'uploads' table
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  ocr_status TEXT CHECK (ocr_status IN ('pending', 'processing', 'success', 'failed')) DEFAULT 'pending',
  ocr_started_at TIMESTAMP WITH TIME ZONE,
  ocr_completed_at TIMESTAMP WITH TIME ZONE,
  ocr_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create 'ocr_results' table
CREATE TABLE public.ocr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  total_cost_eur NUMERIC,
  annual_kwh NUMERIC,
  unit_price_eur_kwh NUMERIC,
  gas_smc NUMERIC,
  pod TEXT,
  pdr TEXT,
  f1_kwh NUMERIC,
  f2_kwh NUMERIC,
  f3_kwh NUMERIC,
  potenza_kw NUMERIC,
  tariff_hint TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  provider TEXT,
  quality_score NUMERIC,
  consumo_annuo_smc NUMERIC,
  prezzo_gas_eur_smc NUMERIC,
  costo_annuo_gas NUMERIC,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create 'ocr_debug' table
CREATE TABLE public.ocr_debug (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  pagina_usata INTEGER,
  raw_json JSONB,
  confidence_avg NUMERIC,
  routing_choice TEXT,
  provider_detected TEXT,
  used_defaults BOOLEAN,
  errors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_debug ENABLE ROW LEVEL SECURITY;

-- 6. Create Policies (Permissive for Anon/Authenticated for now to fix issues)

-- Uploads Policies
CREATE POLICY "Enable all access for anon and authenticated users on uploads"
ON public.uploads FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- OCR Results Policies
CREATE POLICY "Enable all access for anon and authenticated users on ocr_results"
ON public.ocr_results FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- OCR Debug Policies
CREATE POLICY "Enable all access for anon and authenticated users on ocr_debug"
ON public.ocr_debug FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 7. Grant Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.uploads TO anon, authenticated;
GRANT ALL ON TABLE public.ocr_results TO anon, authenticated;
GRANT ALL ON TABLE public.ocr_debug TO anon, authenticated;

-- 8. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
