-- Create ocr_debug table for OCR logging and debugging
CREATE TABLE public.ocr_debug (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  upload_id TEXT,
  pagina_usata INTEGER,
  raw_json JSONB,
  confidence_avg NUMERIC,
  errors TEXT
);

-- Enable RLS
ALTER TABLE public.ocr_debug ENABLE ROW LEVEL SECURITY;

-- Allow system to insert debug logs
CREATE POLICY "System can insert ocr debug logs" 
ON public.ocr_debug 
FOR INSERT 
WITH CHECK (true);

-- Admins can view debug logs
CREATE POLICY "Admins can view ocr debug logs" 
ON public.ocr_debug 
FOR SELECT 
USING (is_admin(auth.uid()));