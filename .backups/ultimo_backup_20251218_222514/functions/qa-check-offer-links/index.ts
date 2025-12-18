import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, status: 0, error: "invalid_or_missing_url" };
  }

  try {
    // Try HEAD request first (faster)
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    // If HEAD fails, try GET
    if (!response.ok && response.status !== 405) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `http_${response.status}`,
    };
  } catch (error: any) {
    console.error(`Error checking URL ${url}:`, error);
    return {
      ok: false,
      status: 0,
      error: error?.message || 'fetch_error',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { limit = 200, force_check = false } = await req.json();

    console.log(`Starting QA check for up to ${limit} offers (force_check: ${force_check})`);

    // Fetch offers to check
    let query = supabase
      .from('offers')
      .select('id, provider, provider_name, product_url, provider_home, redirect_url, url_checked_at, url_ok')
      .eq('is_active', true)
      .limit(limit);

    // If not forcing, only check offers not recently checked or failed last time
    if (!force_check) {
      query = query.or('url_checked_at.is.null,url_ok.is.null,url_ok.eq.false');
    }

    const { data: offers, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch offers: ${fetchError.message}`);
    }

    console.log(`Found ${offers?.length || 0} offers to check`);

    const results = [];

    for (const offer of offers || []) {
      const urlToCheck = offer.product_url || offer.redirect_url || offer.provider_home;
      
      if (!urlToCheck) {
        console.warn(`Offer ${offer.id} has no URL to check`);
        await supabase
          .from('offers')
          .update({
            url_checked_at: new Date().toISOString(),
            url_ok: false,
            url_status: 0,
            url_error: 'no_url_provided',
          })
          .eq('id', offer.id);
        
        results.push({ id: offer.id, provider: offer.provider, ok: false, error: 'no_url' });
        continue;
      }

      console.log(`Checking ${offer.provider} (${offer.id}): ${urlToCheck}`);
      const checkResult = await checkUrl(urlToCheck);

      // Update DB with result
      await supabase
        .from('offers')
        .update({
          url_checked_at: new Date().toISOString(),
          url_ok: checkResult.ok,
          url_status: checkResult.status,
          url_error: checkResult.error || null,
        })
        .eq('id', offer.id);

      results.push({
        id: offer.id,
        provider: offer.provider,
        url: urlToCheck,
        ok: checkResult.ok,
        status: checkResult.status,
        error: checkResult.error,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      total_checked: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
    };

    console.log('QA check completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in qa-check-offer-links:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
