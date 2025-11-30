-- Create comparison_results table for storing offer comparison data
CREATE TABLE IF NOT EXISTS public.comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  user_id UUID,
  profile_json JSONB,
  ranked_offers JSONB NOT NULL,
  best_offer_id UUID,
  best_personalized_offer_id UUID,
  personalization_factors JSONB
);

-- Enable RLS
ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view comparison results" ON public.comparison_results;
CREATE POLICY "Anyone can view comparison results"
ON public.comparison_results
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can manage comparison results" ON public.comparison_results;
CREATE POLICY "Service role can manage comparison results"
ON public.comparison_results
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comparison_results_upload_id 
ON public.comparison_results(upload_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_comparison_results_updated_at ON public.comparison_results;
CREATE TRIGGER update_comparison_results_updated_at
  BEFORE UPDATE ON public.comparison_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
