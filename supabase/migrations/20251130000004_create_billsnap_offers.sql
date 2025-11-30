-- Create billsnap_offers table for frontend compatibility
CREATE TABLE IF NOT EXISTS public.billsnap_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_data JSONB NOT NULL,
  source TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.billsnap_offers ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view billsnap offers" ON public.billsnap_offers;
CREATE POLICY "Anyone can view billsnap offers"
ON public.billsnap_offers
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can manage billsnap offers" ON public.billsnap_offers;
CREATE POLICY "Service role can manage billsnap offers"
ON public.billsnap_offers
FOR ALL
USING (true)
WITH CHECK (true);
