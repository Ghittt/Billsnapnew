-- Add distinct URL fields to offers table for proper link management
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS product_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_home TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS url_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS url_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS url_status INTEGER,
  ADD COLUMN IF NOT EXISTS url_error TEXT;

-- Migrate existing data: copy redirect_url to product_url where needed
UPDATE public.offers 
SET product_url = COALESCE(product_url, redirect_url) 
WHERE product_url IS NULL AND redirect_url IS NOT NULL;

-- Normalize provider_name from provider field
UPDATE public.offers 
SET provider_name = COALESCE(provider_name, provider) 
WHERE provider_name IS NULL;

-- Add index for QA queries
CREATE INDEX IF NOT EXISTS idx_offers_url_checked ON public.offers(url_checked_at, url_ok);

-- Add comment for documentation
COMMENT ON COLUMN public.offers.product_url IS 'Direct link to offer page (deeplink)';
COMMENT ON COLUMN public.offers.provider_home IS 'Provider homepage (fallback)';
COMMENT ON COLUMN public.offers.url_checked_at IS 'Last QA check timestamp';
COMMENT ON COLUMN public.offers.url_ok IS 'Whether URL is accessible and valid';