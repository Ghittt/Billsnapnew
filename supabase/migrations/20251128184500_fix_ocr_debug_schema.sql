-- Ensure ocr_debug table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.ocr_debug (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  upload_id uuid REFERENCES public.uploads(id),
  pagina_usata integer,
  raw_json jsonb,
  confidence_avg numeric,
  routing_choice text,
  provider_detected text,
  used_defaults boolean,
  errors text
);

-- Enable RLS
ALTER TABLE public.ocr_debug ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for anon uploads)
CREATE POLICY "Anyone can insert ocr_debug" ON public.ocr_debug FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view ocr_debug" ON public.ocr_debug FOR SELECT USING (true);

-- Ensure columns exist if table already existed
ALTER TABLE public.ocr_debug 
  ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES public.uploads(id),
  ADD COLUMN IF NOT EXISTS pagina_usata integer,
  ADD COLUMN IF NOT EXISTS raw_json jsonb,
  ADD COLUMN IF NOT EXISTS confidence_avg numeric,
  ADD COLUMN IF NOT EXISTS routing_choice text,
  ADD COLUMN IF NOT EXISTS provider_detected text,
  ADD COLUMN IF NOT EXISTS used_defaults boolean,
  ADD COLUMN IF NOT EXISTS errors text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
