-- Create billsnap_users table for email-first approach
CREATE TABLE IF NOT EXISTS public.billsnap_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notifications_opt_in BOOLEAN DEFAULT true
);

-- Create billsnap_bills table for storing bill data
CREATE TABLE IF NOT EXISTS public.billsnap_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES public.billsnap_users(email) ON DELETE CASCADE,
  raw_data JSONB,
  ai_output JSONB,
  provider TEXT,
  price NUMERIC,
  kwh NUMERIC,
  m3 NUMERIC,
  predicted_savings NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billsnap_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billsnap_bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billsnap_users (allow anonymous inserts)
CREATE POLICY "Anyone can insert email subscriptions"
  ON public.billsnap_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own data"
  ON public.billsnap_users
  FOR SELECT
  USING (true);

-- RLS Policies for billsnap_bills (allow anonymous inserts)
CREATE POLICY "Anyone can insert bills"
  ON public.billsnap_bills
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view bills"
  ON public.billsnap_bills
  FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billsnap_bills_email ON public.billsnap_bills(email);
CREATE INDEX IF NOT EXISTS idx_billsnap_bills_created_at ON public.billsnap_bills(created_at DESC);