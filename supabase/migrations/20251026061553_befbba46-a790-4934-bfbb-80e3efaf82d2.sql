-- Add new columns to ocr_debug for v2 extractor
ALTER TABLE public.ocr_debug 
ADD COLUMN IF NOT EXISTS routing_choice text,
ADD COLUMN IF NOT EXISTS provider_detected text,
ADD COLUMN IF NOT EXISTS used_defaults boolean DEFAULT false;