-- Decision Rules Engine: Parametrized decision logic with audit trail

-- Table: decision_rules (configurable thresholds)
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

-- Default rules
INSERT INTO public.decision_rules (commodity, min_saving_eur_year, min_saving_percent, notes)
VALUES 
  ('LUCE', 50, 5, 'Minimo €50/anno o 5% risparmio'),
  ('GAS', 30, 5, 'Minimo €30/anno o 5% risparmio'),
  ('DUAL', 80, 5, 'Minimo €80/anno o 5% risparmio');

-- Table: decision_audit (complete audit trail)
CREATE TABLE IF NOT EXISTS public.decision_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  upload_id UUID REFERENCES public.uploads(id),
  
  -- Input data
  commodity TEXT,
  current_cost_year NUMERIC,
  consumption_year NUMERIC,
  best_cost_year NUMERIC,
  saving_year NUMERIC,
  saving_percent NUMERIC,
  
  -- Decision
  decision TEXT CHECK (decision IN ('SWITCH', 'STAY', 'INSUFFICIENT_DATA')),
  reasons JSONB,
  
  -- Rule metadata
  rule_id UUID REFERENCES public.decision_rules(id),
  rule_version INTEGER,
  
  -- Comparison metadata
  offers_considered_count INTEGER,
  offers_excluded_count INTEGER
);

-- Policies
ALTER TABLE public.decision_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read decision_rules" 
  ON public.decision_rules FOR SELECT USING (true);
CREATE POLICY "Service role can manage decision_rules" 
  ON public.decision_rules FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert decision_audit" 
  ON public.decision_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read decision_audit" 
  ON public.decision_audit FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_audit_upload ON public.decision_audit(upload_id);
CREATE INDEX IF NOT EXISTS idx_decision_audit_created ON public.decision_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_rules_commodity ON public.decision_rules(commodity, active);
