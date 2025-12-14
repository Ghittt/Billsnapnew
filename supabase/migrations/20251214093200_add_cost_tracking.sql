-- Add cost tracking fields to bill_extractions

ALTER TABLE public.bill_extractions 
  ADD COLUMN IF NOT EXISTS current_cost_year NUMERIC,
  ADD COLUMN IF NOT EXISTS current_cost_year_source TEXT CHECK (current_cost_year_source IN ('BILL', 'CALCULATED'));

COMMENT ON COLUMN public.bill_extractions.current_cost_year 
  IS 'Annualized cost calculated by CostEngine';
COMMENT ON COLUMN public.bill_extractions.current_cost_year_source 
  IS 'Source of annual cost: BILL (from bill) or CALCULATED (from period)';
