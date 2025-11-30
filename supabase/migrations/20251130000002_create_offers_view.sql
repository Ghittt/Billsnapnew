-- Create a view to map offers_scraped to the expected offers table schema
CREATE OR REPLACE VIEW public.offers AS
SELECT
    id,
    created_at,
    provider,
    plan_name,
    commodity,
    pricing_type,
    price_kwh,
    price_f1,
    price_f2,
    price_f3,
    unit_price_eur_smc,
    fixed_fee_eur_mo,
    power_fee_year,
    is_green,
    scraped_url,
    true as is_active, -- Default to active for scraped offers
    'scraped' as source
FROM
    public.offers_scraped;

-- Grant access to the view
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO service_role;
