import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const norm = (s: string | number): number => {
  return parseFloat(String(s).replace(",", ".").replace(/[^\d.]/g, ""));
};

async function scrapeWithFirecrawl(url: string, provider: string, planName: string, fixedFeeYear: number = 0, commodity: string = 'gas', batchId: number = 4) {
  try {
    console.log(`[BATCH-4] Scraping ${provider} from ${url}`);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('[BATCH-4] FIRECRAWL_API_KEY not found');
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
      console.error(`[BATCH-4] Firecrawl error for ${provider}: ${scrapeResponse.status}`);
      return { error: `HTTP ${scrapeResponse.status}`, provider, batch_id: batchId };
    }

    const scrapeResult = await scrapeResponse.json();
    
    if (!scrapeResult.success || !scrapeResult.data) {
      console.error(`[BATCH-4] Scraping failed for ${provider}`);
      return { error: 'Scraping failed', provider, batch_id: batchId };
    }

    const textContent = scrapeResult.data.markdown || '';
    console.log(`[BATCH-4] ${provider} content: ${textContent.length} chars`);

    let price = null;
    const pricePatterns = [/(\d+[.,]\d{2,4})\s*€?\s*\/?\s*Smc/gi, /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*m3/gi];

    for (const pattern of pricePatterns) {
      const matches = textContent.matchAll(pattern);
      for (const match of matches) {
        const p = norm(match[1]);
        if (p > 0.5 && p < 5) {
          price = p;
          break;
        }
      }
      if (price) break;
    }

    console.log(`[BATCH-4] ${provider}: price = ${price}`);

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

    result.unit_price_eur_smc = price;

    return { success: true, data: result };
  } catch (error) {
    console.error(`[BATCH-4] Error scraping ${provider}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error', provider, batch_id: batchId };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BATCH-4] Starting batch 4 scraping (providers 13-16, gas)...');

    const targets = [
      ["https://www.a2aenergia.eu/it/gas", "A2A Energia", "Gas Prezzo Fisso", 118.8, 'gas'],
      ["https://www.eni.com/it-IT/prodotti-servizi/gas-naturale.html", "Eni Plenitude", "Link Gas", 96, 'gas'],
      ["https://www.acea.it/gas", "Acea Energia", "Prezzo Fisso Gas", 105, 'gas'],
      ["https://www.hera.it/gruppo/area-clienti/gas", "Hera Comm", "Hera Gas Fisso", 110, 'gas'],
    ];

    const results = [];
    for (const [url, provider, planName, fixedFeeYear, commodity] of targets) {
      const result = await scrapeWithFirecrawl(
        String(url), 
        String(provider), 
        String(planName), 
        Number(fixedFeeYear),
        String(commodity),
        4
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
    console.log(`[BATCH-4] Completed: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      batch_id: 4,
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BATCH-4] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      batch_id: 4
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
