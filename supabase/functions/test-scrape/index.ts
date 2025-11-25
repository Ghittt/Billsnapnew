import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const norm = (s: string | number): number => {
  return parseFloat(String(s).replace(",", ".").replace(/[^\d.]/g, ""));
};

async function scrapeWithFirecrawl(url: string, provider: string, planName: string, fixedFeeYear: number = 0, commodity: string = 'power') {
  try {
    console.log(`[TEST] Scraping ${provider} from ${url}`);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found');
      return { error: 'API key missing' };
    }

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 25000
      })
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error(`Firecrawl error: ${scrapeResponse.status} - ${errorText}`);
      return { error: `HTTP ${scrapeResponse.status}` };
    }

    const scrapeResult = await scrapeResponse.json();
    
    if (!scrapeResult.success || !scrapeResult.data) {
      console.error('Firecrawl failed:', scrapeResult);
      return { error: 'Scraping failed' };
    }

    const textContent = scrapeResult.data.markdown || '';
    console.log(`[TEST] Content length: ${textContent.length} chars`);

    let price = null;
    const pricePatterns = commodity === 'power' 
      ? [/(\d+[.,]\d{2,4})\s*€?\s*\/?\s*kWh/gi, /(\d+[.,]\d{2,4})\s*cent\w*\s*\/?\s*kWh/gi]
      : [/(\d+[.,]\d{2,4})\s*€?\s*\/?\s*Smc/gi, /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*m3/gi];

    for (const pattern of pricePatterns) {
      const matches = textContent.matchAll(pattern);
      for (const match of matches) {
        const p = norm(match[1]);
        const range = commodity === 'power' ? [0.1, 2] : [0.5, 5];
        if (p > range[0] && p < range[1]) {
          price = p;
          break;
        }
      }
      if (price) break;
    }

    console.log(`[TEST] ${provider}: price = ${price} €/${commodity === 'power' ? 'kWh' : 'Smc'}`);

    const result: any = {
      provider,
      plan_name: planName,
      commodity,
      fixed_fee_eur_mo: Math.round(fixedFeeYear / 12 * 100) / 100,
      pricing_type: 'fixed',
      source: 'firecrawl-test',
      is_active: true,
      valid_from: new Date().toISOString().split('T')[0],
      redirect_url: url
    };

    if (commodity === 'power') {
      result.price_kwh = price;
    } else {
      result.unit_price_eur_smc = price;
    }

    return { success: true, data: result };
  } catch (error) {
    console.error(`[TEST] Error:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TEST-SCRAPE] Starting test scrape with 2 providers...');

    const testTargets = [
      ["https://www.enel.it/it/luce-e-gas/luce", "Enel Energia", "E-Light Test", 102, 'power'],
      ["https://www.sorgenia.it/offerte-luce", "Sorgenia", "Next Energy Test", 114, 'power'],
    ];

    const results = [];
    for (const [url, provider, planName, fixedFeeYear, commodity] of testTargets) {
      const result = await scrapeWithFirecrawl(
        String(url), 
        String(provider), 
        String(planName), 
        Number(fixedFeeYear),
        String(commodity)
      );
      
      results.push({
        provider,
        status: result.error ? 'error' : 'success',
        error: result.error || null,
        data: result.data || null
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`[TEST-SCRAPE] Completed: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      test_mode: true,
      total_tested: results.length,
      successful: successCount,
      results: results,
      firecrawl_configured: !!Deno.env.get('FIRECRAWL_API_KEY')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[TEST-SCRAPE] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});