import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callBatchFunction(batchName: string, supabaseUrl: string, anonKey: string) {
  try {
    console.log(`[MASTER] Calling ${batchName}...`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${batchName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (!response.ok) {
      console.error(`[MASTER] ${batchName} failed: ${response.status}`);
      return { error: `HTTP ${response.status}`, batch: batchName };
    }

    const data = await response.json();
    console.log(`[MASTER] ${batchName} completed: ${data.successful}/${data.total} successful`);
    return data;
  } catch (error) {
    console.error(`[MASTER] Error calling ${batchName}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error', batch: batchName };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[MASTER] Starting master scraping orchestration...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // STEP 1: Deactivate all existing Firecrawl offers
    console.log('[MASTER] Deactivating existing Firecrawl offers...');
    await supabase
      .from('offers')
      .update({ is_active: false })
      .in('source', ['firecrawl', 'scraper']);

    // STEP 2: Call all 4 batches sequentially
    const batch1 = await callBatchFunction('scrape-batch-1', supabaseUrl, supabaseAnonKey);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const batch2 = await callBatchFunction('scrape-batch-2', supabaseUrl, supabaseAnonKey);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const batch3 = await callBatchFunction('scrape-batch-3', supabaseUrl, supabaseAnonKey);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const batch4 = await callBatchFunction('scrape-batch-4', supabaseUrl, supabaseAnonKey);

    // STEP 3: Aggregate results
    const batches = [batch1, batch2, batch3, batch4];
    const allOffers: any[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    batches.forEach((batch) => {
      if (batch.results) {
        batch.results.forEach((result: any) => {
          if (result.status === 'success' && result.data) {
            allOffers.push(result.data);
            totalSuccess++;
          } else {
            totalFailed++;
          }
        });
      }
    });

    console.log(`[MASTER] Aggregated ${allOffers.length} valid offers from all batches`);

    // STEP 4: Insert all offers into Supabase
    if (allOffers.length > 0) {
      const { data: insertedOffers, error: insertError } = await supabase
        .from('offers')
        .insert(allOffers)
        .select();

      if (insertError) {
        console.error('[MASTER] Error inserting offers:', insertError);
        return new Response(JSON.stringify({ 
          error: 'Failed to save offers',
          details: insertError.message,
          scraped_count: allOffers.length
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[MASTER] Successfully inserted ${insertedOffers?.length || 0} offers`);
    }

    // STEP 5: Return final summary
    return new Response(JSON.stringify({
      success: true,
      total_providers: 16,
      successful: totalSuccess,
      failed: totalFailed,
      inserted: allOffers.length,
      batches: batches.map((b, i) => ({
        batch_id: i + 1,
        successful: b.successful || 0,
        total: b.total || 0,
        error: b.error || null
      })),
      updated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MASTER] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
