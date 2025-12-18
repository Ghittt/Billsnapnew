-- Add was_estimated flag to track calculated vs real data

ALTER TABLE public.bill_extractions 
  ADD COLUMN IF NOT EXISTS consumption_year_was_estimated BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.bill_extractions.consumption_year_was_estimated 
  IS 'True if consumption_year was calculated from period data, false if from real annual data in bill';
