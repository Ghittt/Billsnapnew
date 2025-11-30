-- Restore ocr_debug table if missing
CREATE TABLE IF NOT EXISTS public.ocr_debug (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  upload_id uuid REFERENCES public.uploads(id) ON DELETE CASCADE,
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

-- Allow public access (adjust as needed for security, but keeping it open for anon uploads debugging)
CREATE POLICY "Enable all access for anon and authenticated users on ocr_debug"
ON public.ocr_debug FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE public.ocr_debug TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
