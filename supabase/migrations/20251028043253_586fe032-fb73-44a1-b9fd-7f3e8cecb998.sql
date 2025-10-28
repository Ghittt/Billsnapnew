-- Add fields to uploads table for bill type classification and gas data
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS tipo_bolletta text CHECK (tipo_bolletta IN ('luce', 'gas', 'combo'));
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS pdr text;

-- Add constraint for PDR format (14 digits)
ALTER TABLE uploads ADD CONSTRAINT check_pdr_format CHECK (pdr IS NULL OR pdr ~ '^\d{14}$');

-- Add fields to ocr_results table for gas extraction
ALTER TABLE ocr_results ADD COLUMN IF NOT EXISTS consumo_annuo_smc numeric;
ALTER TABLE ocr_results ADD COLUMN IF NOT EXISTS prezzo_gas_eur_smc numeric;
ALTER TABLE ocr_results ADD COLUMN IF NOT EXISTS costo_annuo_gas numeric;
ALTER TABLE ocr_results ADD COLUMN IF NOT EXISTS costo_annuo_totale numeric;

-- Add tipo_bolletta to ocr_debug for logging
ALTER TABLE ocr_debug ADD COLUMN IF NOT EXISTS tipo_bolletta text;
ALTER TABLE ocr_debug ADD COLUMN IF NOT EXISTS classification_confidence numeric;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_tipo_bolletta ON uploads(tipo_bolletta);
CREATE INDEX IF NOT EXISTS idx_offers_commodity ON offers(commodity);

COMMENT ON COLUMN uploads.tipo_bolletta IS 'Type of bill: luce (electricity), gas, or combo (both)';
COMMENT ON COLUMN uploads.pdr IS 'PDR identifier for gas bills (14 digits)';
COMMENT ON COLUMN ocr_results.consumo_annuo_smc IS 'Annual gas consumption in standard cubic meters';
COMMENT ON COLUMN ocr_results.prezzo_gas_eur_smc IS 'Gas unit price in EUR per Smc';
COMMENT ON COLUMN ocr_results.costo_annuo_gas IS 'Annual gas cost in EUR';
COMMENT ON COLUMN ocr_results.costo_annuo_totale IS 'Total annual cost for combo bills (luce + gas)';