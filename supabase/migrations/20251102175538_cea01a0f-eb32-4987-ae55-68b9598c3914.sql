-- Create collective signups table
CREATE TABLE public.collective_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  email TEXT NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('energy', 'gas', 'dual')),
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate signups
CREATE UNIQUE INDEX idx_collective_signups_email_commodity ON public.collective_signups(email, commodity);

-- Create collective stats table
CREATE TABLE public.collective_stats (
  id INTEGER NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  target INTEGER NOT NULL DEFAULT 2000,
  current_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial stats row
INSERT INTO public.collective_stats (id, target, current_count) VALUES (1, 2000, 0);

-- Enable RLS
ALTER TABLE public.collective_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collective_stats ENABLE ROW LEVEL SECURITY;

-- Policies for collective_signups
CREATE POLICY "Anyone can insert collective signups"
  ON public.collective_signups
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view collective signups count"
  ON public.collective_signups
  FOR SELECT
  USING (true);

-- Policies for collective_stats
CREATE POLICY "Anyone can view collective stats"
  ON public.collective_stats
  FOR SELECT
  USING (true);

CREATE POLICY "System can update collective stats"
  ON public.collective_stats
  FOR UPDATE
  USING (true);

-- Function to update collective stats count
CREATE OR REPLACE FUNCTION update_collective_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.collective_stats
  SET current_count = (SELECT COUNT(*) FROM public.collective_signups),
      updated_at = now()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update count on new signup
CREATE TRIGGER trigger_update_collective_count
AFTER INSERT ON public.collective_signups
FOR EACH ROW
EXECUTE FUNCTION update_collective_count();