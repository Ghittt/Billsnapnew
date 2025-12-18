-- Add missing column for consumption estimation tracking
ALTER TABLE bill_extractions 
ADD COLUMN IF NOT EXISTS consumption_year_was_estimated BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN bill_extractions.consumption_year_was_estimated IS 'Indicates if consumption_year was calculated from period data rather than extracted directly';
