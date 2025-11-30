require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log("Creating comparison_results table...");
  
  // Note: We can't execute DDL via the JS client with anon key
  // We need to use the SQL editor in Supabase dashboard or use service role key
  
  console.log("ERROR: Cannot create tables via anon key.");
  console.log("Please run the following SQL in Supabase SQL Editor:");
  console.log("\n--- SQL TO RUN ---\n");
  
  const sql = `
-- Create comparison_results table
CREATE TABLE IF NOT EXISTS public.comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  upload_id UUID NOT NULL,
  user_id UUID,
  profile_json JSONB,
  ranked_offers JSONB NOT NULL,
  best_offer_id UUID,
  best_personalized_offer_id UUID,
  personalization_factors JSONB
);

ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comparison results"
ON public.comparison_results FOR SELECT USING (true);

CREATE POLICY "Service role can manage comparison results"
ON public.comparison_results FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_comparison_results_upload_id 
ON public.comparison_results(upload_id);

-- Create billsnap_offers table
CREATE TABLE IF NOT EXISTS public.billsnap_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_data JSONB NOT NULL,
  source TEXT NOT NULL
);

ALTER TABLE public.billsnap_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view billsnap offers"
ON public.billsnap_offers FOR SELECT USING (true);

CREATE POLICY "Service role can manage billsnap offers"
ON public.billsnap_offers FOR ALL USING (true) WITH CHECK (true);
`;
  
  console.log(sql);
  console.log("\n--- END SQL ---\n");
}

createTables();
