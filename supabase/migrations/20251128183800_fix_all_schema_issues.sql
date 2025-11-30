-- Comprehensive fix for all schema issues

-- 1. Ensure ocr_results has user_id column
ALTER TABLE public.ocr_results 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Ensure all required columns exist in ocr_results
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
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
