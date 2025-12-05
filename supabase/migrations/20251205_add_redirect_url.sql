-- Add redirect_url column to offers_scraped table
ALTER TABLE offers_scraped ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Update existing offers with provider-based URLs
UPDATE offers_scraped SET redirect_url = 
  CASE 
    WHEN provider ILIKE '%pulsee%' THEN 'https://www.pulsee.it/offerte-luce-gas'
    WHEN provider ILIKE '%enel%' THEN 'https://www.enel.it/it/luce-e-gas'
    WHEN provider ILIKE '%eni%' OR provider ILIKE '%plenitude%' THEN 'https://eniplenitude.com/offerte'
    WHEN provider ILIKE '%a2a%' THEN 'https://www.a2a.it/offerte-luce-gas'
    WHEN provider ILIKE '%edison%' THEN 'https://www.edison.it/offerte-luce-gas'
    WHEN provider ILIKE '%sorgenia%' THEN 'https://www.sorgenia.it/offerte-luce-gas'
    WHEN provider ILIKE '%illumia%' THEN 'https://www.illumia.it/offerte'
    WHEN provider ILIKE '%wekiwi%' THEN 'https://www.wekiwi.it/offerte'
    WHEN provider ILIKE '%iren%' THEN 'https://www.irenlucegas.it/offerte'
    WHEN provider ILIKE '%hera%' THEN 'https://www.heracomm.it/offerte'
    ELSE 'https://www.google.com/search?q=' || REPLACE(provider || ' ' || plan_name || ' offerta', ' ', '+')
  END
WHERE redirect_url IS NULL;
