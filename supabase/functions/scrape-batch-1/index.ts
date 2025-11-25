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

async function scrapeWithFirecrawl(url: string, provider: string, planName: string, fixedFeeYear: number = 0, commodity: string = 'power', batchId: number = 1) {
  try {
    console.log(`[BATCH-1] Scraping ${provider} from ${url}`);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('[BATCH-1] FIRECRAWL_API_KEY not found');
      return { error: 'API key missing', provider, batch_id: batchId };
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
        timeout: 20000
      })
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error(`[BATCH-1] Firecrawl error for ${provider}: ${scrapeResponse.status} - ${errorText}`);
      return { error: `HTTP ${scrapeResponse.status}`, provider, batch_id: batchId };
    }

    const scrapeResult = await scrapeResponse.json();
    
    if (!scrapeResult.success || !scrapeResult.data) {
      console.error(`[BATCH-1] Scraping failed for ${provider}:`, scrapeResult);
      return { error: 'Scraping failed', provider, batch_id: batchId };
    }

    const textContent = scrapeResult.data.markdown || '';
    console.log(`[BATCH-1] ${provider} content length: ${textContent.length} chars`);

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

    console.log(`[BATCH-1] ${provider}: price = ${price} €/${commodity === 'power' ? 'kWh' : 'Smc'}`);

    const result: any = {
      provider,
      plan_name: planName,
      commodity,
      fixed_fee_eur_mo: Math.round(fixedFeeYear / 12 * 100) / 100,
      pricing_type: 'fixed',
      source: 'firecrawl',
      is_active: true,
      valid_from: new Date().toISOString().split('T')[0],
      redirect_url: url,
      batch_id: batchId,
      raw_json: { scraped_at: new Date().toISOString(), content_length: textContent.length }
    };

    if (commodity === 'power') {
      result.price_kwh = price;
    } else {
      result.unit_price_eur_smc = price;
    }

    return { success: true, data: result };
  } catch (error) {
    console.error(`[BATCH-1] Error scraping ${provider}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error', provider, batch_id: batchId };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BATCH-1] Starting batch 1 scraping (providers 1-4)...');

    const targets = [
      ["https://www.enel.it/it/luce-e-gas/luce", "Enel Energia", "E-Light Luce", 102, 'power'],
      ["https://www.sorgenia.it/offerte-luce", "Sorgenia", "Next Energy Luce", 114, 'power'],
      ["https://www.edisonenergia.it/offerte-luce", "Edison Energia", "Luce Prezzo Fisso", 120, 'power'],
      ["https://www.irenlucegas.it/luce", "Iren Luce e Gas", "Luce Prezzo Fisso", 108, 'power'],
    ];

    const results = [];
    for (const [url, provider, planName, fixedFeeYear, commodity] of targets) {
      const result = await scrapeWithFirecrawl(
        String(url), 
        String(provider), 
        String(planName), 
        Number(fixedFeeYear),
        String(commodity),
        1
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
    console.log(`[BATCH-1] Completed: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      batch_id: 1,
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BATCH-1] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      batch_id: 1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
