-- Create table for group buying subscribers
CREATE TABLE IF NOT EXISTS public.group_buying_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  city TEXT,
  province TEXT,
  annual_consumption_kwh INTEGER,
  current_provider TEXT,
  interested_in TEXT, -- 'luce', 'gas', 'dual'
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_group_buying_subscribers_email ON public.group_buying_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_group_buying_subscribers_status ON public.group_buying_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_group_buying_subscribers_subscribed_at ON public.group_buying_subscribers(subscribed_at DESC);

-- Enable RLS
ALTER TABLE public.group_buying_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for subscription form)
CREATE POLICY "Allow anonymous inserts"
  ON public.group_buying_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated reads (for admin/export)
CREATE POLICY "Allow authenticated reads"
  ON public.group_buying_subscribers
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT INSERT ON public.group_buying_subscribers TO anon;
GRANT SELECT ON public.group_buying_subscribers TO authenticated;
GRANT ALL ON public.group_buying_subscribers TO service_role;
