-- Create calc_log table for calculation debugging
CREATE TABLE IF NOT EXISTS public.calc_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  upload_id TEXT,
  tipo TEXT,
  consumo NUMERIC,
  prezzo NUMERIC,
  quota_fissa_mese NUMERIC,
  costo_annuo NUMERIC,
  flags JSONB
);

-- Enable RLS
ALTER TABLE public.calc_log ENABLE ROW LEVEL SECURITY;

-- System can insert calc logs
CREATE POLICY "System can insert calc logs"
ON public.calc_log
FOR INSERT
WITH CHECK (true);

-- Admins can view calc logs
CREATE POLICY "Admins can view calc logs"
ON public.calc_log
FOR SELECT
USING (is_admin(auth.uid()));