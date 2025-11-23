-- Add energy_type column to billsnap_users table
ALTER TABLE public.billsnap_users 
  ADD COLUMN IF NOT EXISTS energy_type text CHECK (energy_type IN ('luce', 'gas', 'entrambi'));

-- Add comment for clarity
COMMENT ON COLUMN public.billsnap_users.energy_type IS 
  'Tipo di energia di interesse: luce, gas, o entrambi';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_billsnap_users_energy_type 
  ON public.billsnap_users(energy_type);

-- Create optional billsnap_offers table for Firecrawl results
CREATE TABLE IF NOT EXISTS public.billsnap_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text REFERENCES public.billsnap_users(email) ON DELETE CASCADE,
  source text NOT NULL,
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on billsnap_offers
ALTER TABLE public.billsnap_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies for billsnap_offers
CREATE POLICY "Anyone can insert offers" 
  ON public.billsnap_offers 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can view offers" 
  ON public.billsnap_offers 
  FOR SELECT 
  USING (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_billsnap_offers_email 
  ON public.billsnap_offers(email);

CREATE INDEX IF NOT EXISTS idx_billsnap_offers_created_at 
  ON public.billsnap_offers(created_at DESC);