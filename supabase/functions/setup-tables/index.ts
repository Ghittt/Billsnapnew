import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SETUP] Creating tables via direct query...');

    // Execute raw SQL to create tables
    const sql1 = `
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
    `;

    const sql2 = `ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;`;
    
    const sql3 = `
      DROP POLICY IF EXISTS "Anyone can view comparison results" ON public.comparison_results;
      CREATE POLICY "Anyone can view comparison results"
      ON public.comparison_results FOR SELECT USING (true);
    `;

    const sql4 = `
      DROP POLICY IF EXISTS "Service role can manage comparison results" ON public.comparison_results;
      CREATE POLICY "Service role can manage comparison results"
      ON public.comparison_results FOR ALL USING (true) WITH CHECK (true);
    `;

    const sql5 = `CREATE INDEX IF NOT EXISTS idx_comparison_results_upload_id ON public.comparison_results(upload_id);`;

    const sql6 = `
      CREATE TABLE IF NOT EXISTS public.billsnap_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        raw_data JSONB NOT NULL,
        source TEXT NOT NULL
      );
    `;

    const sql7 = `ALTER TABLE public.billsnap_offers ENABLE ROW LEVEL SECURITY;`;

    const sql8 = `
      DROP POLICY IF EXISTS "Anyone can view billsnap offers" ON public.billsnap_offers;
      CREATE POLICY "Anyone can view billsnap offers"
      ON public.billsnap_offers FOR SELECT USING (true);
    `;

    const sql9 = `
      DROP POLICY IF EXISTS "Service role can manage billsnap offers" ON public.billsnap_offers;
      CREATE POLICY "Service role can manage billsnap offers"
      ON public.billsnap_offers FOR ALL USING (true) WITH CHECK (true);
    `;

    // Execute each statement
    const statements = [sql1, sql2, sql3, sql4, sql5, sql6, sql7, sql8, sql9];
    const results = [];

    for (const sql of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        results.push({ sql: sql.substring(0, 50), error: error?.message || null });
      } catch (e) {
        results.push({ sql: sql.substring(0, 50), error: String(e) });
      }
    }

    console.log('[SETUP] Results:', results);

    return new Response(JSON.stringify({
      ok: true,
      message: 'Setup complete',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[SETUP] Fatal error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
