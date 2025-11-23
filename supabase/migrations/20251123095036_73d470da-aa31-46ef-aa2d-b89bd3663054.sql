-- Fix immutable expression error by removing problematic generated columns if they exist
-- This will ensure the database is in a clean state

-- Drop any problematic generated columns from ai_recommendations if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_recommendations' 
    AND column_name = 'is_expired'
  ) THEN
    ALTER TABLE public.ai_recommendations DROP COLUMN IF EXISTS is_expired;
  END IF;
END $$;

-- Ensure all tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.offers_scraped (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('luce', 'gas', 'dual')),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fisso', 'variabile', 'indicizzato')),
  price_kwh DECIMAL,
  price_f1 DECIMAL,
  price_f2 DECIMAL,
  price_f3 DECIMAL,
  unit_price_eur_smc DECIMAL,
  fixed_fee_eur_mo DECIMAL NOT NULL DEFAULT 0,
  power_fee_year DECIMAL DEFAULT 0,
  is_green BOOLEAN DEFAULT false,
  scraped_url TEXT,
  raw_data JSONB,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  user_id UUID,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('immediate', 'scheduled', 'seasonal')),
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning JSONB,
  estimated_saving_eur DECIMAL,
  expires_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.contracts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('luce', 'gas', 'dual')),
  provider TEXT NOT NULL,
  plan_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  annual_cost_eur DECIMAL,
  annual_kwh DECIMAL,
  annual_smc DECIMAL,
  notes TEXT,
  upload_id UUID REFERENCES public.uploads(id)
);

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('contract_renewal', 'price_check', 'seasonal_switch')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS public.consumption_prediction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  upload_id UUID REFERENCES public.uploads(id),
  prediction_date DATE NOT NULL,
  predicted_kwh DECIMAL,
  predicted_smc DECIMAL,
  confidence_score DECIMAL CHECK (confidence_score BETWEEN 0 AND 1),
  factors JSONB,
  actual_kwh DECIMAL,
  actual_smc DECIMAL
);

-- Enable RLS
ALTER TABLE public.offers_scraped ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_prediction ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers_scraped
DROP POLICY IF EXISTS "Anyone can view scraped offers" ON public.offers_scraped;
CREATE POLICY "Anyone can view scraped offers" ON public.offers_scraped FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage scraped offers" ON public.offers_scraped;
CREATE POLICY "Admins can manage scraped offers" ON public.offers_scraped FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for ai_recommendations
DROP POLICY IF EXISTS "Users can view their recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can view their recommendations" ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their recommendations" ON public.ai_recommendations;
CREATE POLICY "Users can update their recommendations" ON public.ai_recommendations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert recommendations" ON public.ai_recommendations;
CREATE POLICY "System can insert recommendations" ON public.ai_recommendations FOR INSERT WITH CHECK (true);

-- RLS Policies for contracts_history
DROP POLICY IF EXISTS "Users can view their contract history" ON public.contracts_history;
CREATE POLICY "Users can view their contract history" ON public.contracts_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their contracts" ON public.contracts_history;
CREATE POLICY "Users can insert their contracts" ON public.contracts_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their contracts" ON public.contracts_history;
CREATE POLICY "Users can update their contracts" ON public.contracts_history FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for scheduled_reminders
DROP POLICY IF EXISTS "Users can view their reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can view their reminders" ON public.scheduled_reminders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can manage their reminders" ON public.scheduled_reminders FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for consumption_prediction
DROP POLICY IF EXISTS "Users can view their predictions" ON public.consumption_prediction;
CREATE POLICY "Users can view their predictions" ON public.consumption_prediction FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert predictions" ON public.consumption_prediction;
CREATE POLICY "System can insert predictions" ON public.consumption_prediction FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_offers_scraped_updated_at ON public.offers_scraped;
CREATE TRIGGER update_offers_scraped_updated_at
  BEFORE UPDATE ON public.offers_scraped
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_recommendations_updated_at ON public.ai_recommendations;
CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_history_updated_at ON public.contracts_history;
CREATE TRIGGER update_contracts_history_updated_at
  BEFORE UPDATE ON public.contracts_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_reminders_updated_at ON public.scheduled_reminders;
CREATE TRIGGER update_scheduled_reminders_updated_at
  BEFORE UPDATE ON public.scheduled_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_consumption_prediction_updated_at ON public.consumption_prediction;
CREATE TRIGGER update_consumption_prediction_updated_at
  BEFORE UPDATE ON public.consumption_prediction
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();