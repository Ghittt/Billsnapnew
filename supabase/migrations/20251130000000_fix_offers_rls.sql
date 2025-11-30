-- Fix RLS for offers_scraped to allow service role inserts

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage scraped offers" ON public.offers_scraped;

-- Create permissive policy for service role
CREATE POLICY "Service role can manage offers" 
ON public.offers_scraped 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Keep read policy for everyone
DROP POLICY IF EXISTS "Anyone can view scraped offers" ON public.offers_scraped;
CREATE POLICY "Anyone can view scraped offers" 
ON public.offers_scraped 
FOR SELECT 
USING (true);
