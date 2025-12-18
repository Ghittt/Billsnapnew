-- CONSOLIDATED MIGRATION: Complete Audit System
-- Includes: bill_extractions, was_estimated flag, cost tracking, decision rules

-- 1. Create bill_extractions if not exists
CREATE TABLE IF NOT EXISTS public.bill_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES public.uploads(id),
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  commodity TEXT,
  period_months NUMERIC,
  consumption_period NUMERIC,
  consumption_year NUMERIC,
  consumption_year_was_estimated BOOLEAN DEFAULT false,
  total_due NUMERIC,
  supplier TEXT,
  confidence NUMERIC,
  source_fields JSONB,
  raw_ocr_response JSONB,
  current_cost_year NUMERIC,
  current_cost_year_source TEXT CHECK (current_cost_year_source IN ('BILL', 'CALCULATED'))
);

-- 2. decision_rules table
CREATE TABLE IF NOT EXISTS public.decision_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity TEXT NOT NULL CHECK (commodity IN ('LUCE', 'GAS', 'DUAL')),
  min_saving_eur_year NUMERIC NOT NULL,
  min_saving_percent NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Insert default rules only if table is empty
INSERT INTO public.decision_rules (commodity, min_saving_eur_year, min_saving_percent, notes)
SELECT 'LUCE', 50, 5, 'Minimo €50/anno o 5% risparmio'
WHERE NOT EXISTS (SELECT 1 FROM public.decision_rules WHERE commodity = 'LUCE');

INSERT INTO public.decision_rules (commodity, min_saving_eur_year, min_saving_percent, notes)
SELECT 'GAS', 30, 5, 'Minimo €30/anno o 5% risparmio'
WHERE NOT EXISTS (SELECT 1 FROM public.decision_rules WHERE commodity = 'GAS');

INSERT INTO public.decision_rules (commodity, min_saving_eur_year, min_saving_percent, notes)
SELECT 'DUAL', 80, 5, 'Minimo €80/anno o 5% risparmio'
WHERE NOT EXISTS (SELECT 1 FROM public.decision_rules WHERE commodity = 'DUAL');

-- 3. decision_audit table
CREATE TABLE IF NOT EXISTS public.decision_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  upload_id UUID REFERENCES public.uploads(id),
  commodity TEXT,
  current_cost_year NUMERIC,
  consumption_year NUMERIC,
  best_cost_year NUMERIC,
  saving_year NUMERIC,
  saving_percent NUMERIC,
  decision TEXT CHECK (decision IN ('SWITCH', 'STAY', 'INSUFFICIENT_DATA')),
  reasons JSONB,
  rule_id UUID REFERENCES public.decision_rules(id),
  rule_version INTEGER,
  offers_considered_count INTEGER,
  offers_excluded_count INTEGER
);

-- 4. RLS Policies
ALTER TABLE public.decision_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read decision_rules" ON public.decision_rules;
CREATE POLICY "Anyone can read decision_rules" 
  ON public.decision_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert decision_audit" ON public.decision_audit;
CREATE POLICY "Anyone can insert decision_audit" 
  ON public.decision_audit FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read decision_audit" ON public.decision_audit;
CREATE POLICY "Anyone can read decision_audit" 
  ON public.decision_audit FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert bill_extractions" ON public.bill_extractions;
CREATE POLICY "Anyone can insert bill_extractions" 
  ON public.bill_extractions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read bill_extractions" ON public.bill_extractions;
CREATE POLICY "Anyone can read bill_extractions" 
  ON public.bill_extractions FOR SELECT USING (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_decision_audit_upload ON public.decision_audit(upload_id);
CREATE INDEX IF NOT EXISTS idx_decision_audit_created ON public.decision_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_rules_commodity ON public.decision_rules(commodity, active);
CREATE INDEX IF NOT EXISTS idx_bill_extractions_upload ON public.bill_extractions(upload_id);
