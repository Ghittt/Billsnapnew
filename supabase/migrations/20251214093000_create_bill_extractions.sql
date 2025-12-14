-- BillNormalized: Canonical schema for bill extraction
-- Creates bill_extractions table with stable, unified structure

CREATE TABLE IF NOT EXISTS public.bill_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Commodity type
  commodity TEXT CHECK (commodity IN ('GAS', 'LUCE', 'DUAL')),
  
  -- Billing period
  period_months INTEGER,
  period_start DATE,
  period_end DATE,
  
  -- Consumption
  consumption_period NUMERIC,  -- This period (kWh or Smc)
  consumption_year NUMERIC,    -- Annual (prefer "ultimi 12 mesi")
  consumption_unit TEXT CHECK (consumption_unit IN ('KWH', 'SMC')),
  
  -- Cost
  total_due NUMERIC,  -- Total to pay
  
  -- Supplier info
  supplier TEXT,
  pod TEXT,  -- IT... for LUCE
  pdr TEXT,  -- 14 digits for GAS
  
  -- Quality metrics
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  source_fields JSONB DEFAULT '{}',
  
  -- Raw response for debugging
  raw_ocr_response JSONB
);

-- Enable RLS
ALTER TABLE public.bill_extractions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert bill_extractions" 
  ON public.bill_extractions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read bill_extractions" 
  ON public.bill_extractions FOR SELECT USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bill_extractions_upload ON public.bill_extractions(upload_id);
CREATE INDEX IF NOT EXISTS idx_bill_extractions_extracted ON public.bill_extractions(extracted_at DESC);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
