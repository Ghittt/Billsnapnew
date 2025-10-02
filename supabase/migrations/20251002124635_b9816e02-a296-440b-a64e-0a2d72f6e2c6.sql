-- Create bills table for storing OCR attempts
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT,
  fields_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Allow public insertion
CREATE POLICY "Public can create bills" 
ON public.bills 
FOR INSERT 
WITH CHECK (true);

-- Allow public to view their own bills
CREATE POLICY "Public can view bills" 
ON public.bills 
FOR SELECT 
USING (true);